---
# tributary-w2uz
title: 'L-02: Standalone Transfer Instruction — Unbounded Admin Withdrawal'
status: todo
type: task
priority: low
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-13T05:51:21Z
parent: tributary-4kt4
---

# L-02: Standalone Transfer Instruction — Unbounded Admin Withdrawal

| Field          | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| **Severity**   | Low (design note / trust assumption)                              |
| **File**       | `programs/tributary/src/instructions/transfer.rs`                 |
| **Function**   | `TransferTokens::handler` (exposed as `transfer` in `lib.rs:126`) |
| **Program ID** | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6X1Sg42tJ`                      |
| **Anchor**     | 0.31.1                                                            |

---

## 1. Description

The `transfer` instruction lets a **gateway authority** move tokens from any token account they own to any destination — outside the recurring-payment policy flow. It exists so gateway operators can perform manual or off-cycle transfers (refunds, one-time charges, corrections) without requiring users to sign individual transactions.

**Call signature** (`lib.rs:126`):

```rust
pub fn transfer<'info>(
    ctx: Context<'_, '_, 'info, 'info, TransferTokens<'info>>,
    amount: u64,
    memo: [u8; 64],
) -> Result<()>
```

**Flow inside `transfer.rs:67-201`:**

1. Verify `amount > 0`.
2. Compute `gateway_fee` and `protocol_fee` from BPS rates, subtract from `amount` → `recipient_amount`.
3. Optional referral reward distribution from `gateway_fee`.
4. Three `transfer_checked` CPIs: recipient, gateway fee account, protocol fee account.
5. Emit `PaymentRecord` with `payment_policy = Pubkey::default()` and `record_id = 0`.

---

## 2. Risk Analysis

### 2.1 Access Control — Verified Correct

```rust
// transfer.rs:14-16
#[account(
    constraint = from.owner == authority.key() @ TributaryError::Unauthorized,
)]
pub authority: Signer<'info>,
```

The `authority` **must be a signer** and must be the **owner of the source token account** (`from.owner == authority.key()`). The `from` account's owner is set by the SPL Token program — it is the wallet that created the token account.

**Critical observation:** The `authority` is checked against `from.owner`, **not** against `gateway.authority`. This means:

- The caller must own the token account they are transferring **from**.
- The gateway PDA is verified (`seeds = [GATEWAY_SEED, gateway.authority.as_ref()]`) but the caller is **not** required to be `gateway.authority` or `gateway.signer`.
- A user can call `transfer` on **their own** token accounts, using any active gateway as a conduit.

### 2.2 Trust Model

| Who calls           | What happens                                                     |
| ------------------- | ---------------------------------------------------------------- |
| Token account owner | Moves their own tokens; pays gateway + protocol fees voluntarily |
| Anyone else         | Fails — `from.owner != authority.key()`                          |

The instruction is **not** an admin backdoor. It is a **voluntary fee-bearing transfer** routed through a gateway. The token owner must sign and chooses the amount and destination.

### 2.3 What Remains

Even though access control is sound, the instruction carries design-level concerns:

1. **No amount cap** — a user (or integrator building on behalf of a user) can transfer their entire balance in one call.
2. **No rate limit** — can be called repeatedly with no cooldown.
3. **Reuses `PaymentRecord` event** — standalone transfers emit the same event as policy executions, differentiated only by `payment_policy == Pubkey::default()`. Off-chain indexers that don't check this field will conflate manual transfers with scheduled payments.
4. **No opt-in/opt-out flag** — the instruction is always available for every active gateway. There is no `transfer_enabled` feature flag.
5. **Fee application** — gateway and protocol fees are applied even though no policy is involved. A user performing a self-transfer through a gateway loses a percentage to fees. This is by design (gateway charges for the service) but should be documented.

---

## 3. Impact

**Unauthorized token transfers: NOT POSSIBLE.** Only the token account owner can initiate a transfer.

**Design concerns:**

| Concern               | Impact                                                   |
| --------------------- | -------------------------------------------------------- |
| No amount/rate limits | User can drain full balance; no circuit-breaker          |
| Shared event schema   | Indexers may misclassify manual transfers as payments    |
| No feature flag       | Cannot disable per-gateway without shutting down gateway |
| Undocumented fees     | Users may not realize fees apply to standalone transfers |

Severity is **Low** because the access control is correct. The finding is about hardening and documentation, not a vulnerability.

---

## 4. Audit of Access Control

### Checks in place:

| Check                                        | Location             | Verdict |
| -------------------------------------------- | -------------------- | ------- |
| `authority` is `Signer`                      | `transfer.rs:17`     | ✅ Pass |
| `from.owner == authority.key()`              | `transfer.rs:15`     | ✅ Pass |
| `config` PDA seeds + bump                    | `transfer.rs:21`     | ✅ Pass |
| `!config.emergency_pause`                    | `transfer.rs:22`     | ✅ Pass |
| `gateway` PDA seeds + bump + `is_active`     | `transfer.rs:28`     | ✅ Pass |
| Mint consistency (`from.mint == mint.key()`) | `transfer.rs:35`     | ✅ Pass |
| Mint consistency (`from.mint == to.mint`)    | `transfer.rs:44`     | ✅ Pass |
| `to != from` (distinct accounts)             | `transfer.rs:45`     | ✅ Pass |
| Gateway fee account mint + owner match       | `transfer.rs:51-52`  | ✅ Pass |
| Protocol fee account mint + owner match      | `transfer.rs:58-59`  | ✅ Pass |
| `amount > 0`                                 | `transfer.rs:72`     | ✅ Pass |
| `from.amount >= amount` (sufficient balance) | `transfer.rs:116`    | ✅ Pass |
| Checked arithmetic throughout                | `transfer.rs:91-113` | ✅ Pass |
| `PaymentRecord` emitted                      | `transfer.rs:180`    | ✅ Pass |

### Not checked (by design, but notable):

| Missing check                       | Note                                               |
| ----------------------------------- | -------------------------------------------------- |
| `authority == gateway.authority`    | Intentional — any token owner can use any gateway  |
| Transfer amount cap                 | No limit enforced                                  |
| Cooldown / rate limit               | No on-chain rate limiting                          |
| User opt-in to standalone transfers | No signature or flag required beyond owning tokens |

---

## 5. Recommendations

### 5.1 Add a `transfer_enabled` Feature Flag

Add bit 3 to `PaymentGateway.feature_flags` and enforce it in the transfer handler.

**`programs/tributary/src/state/payment_gateway.rs`** — add constant:

```rust
pub const FEATURE_TRANSFER: u8 = 0x08;

pub fn is_transfer_enabled(&self) -> bool {
    self.feature_flags & Self::FEATURE_TRANSFER != 0
}
```

**`programs/tributary/src/instructions/transfer.rs`** — add constraint:

```rust
#[account(
    seeds = [GATEWAY_SEED, gateway.authority.as_ref()],
    bump = gateway.bump,
    constraint = gateway.is_active,
    constraint = gateway.is_transfer_enabled() @ TributaryError::ComposableNotEnabled,
)]
pub gateway: Box<Account<'info, PaymentGateway>>,
```

> Note: `ComposableNotEnabled` is reused here; alternatively add a dedicated error `TransferNotEnabled`.

**`programs/tributary/src/error.rs`** — add dedicated error:

```rust
#[msg("Standalone transfers not enabled for this gateway")]
TransferNotEnabled,
```

Then update the constraint to `@ TributaryError::TransferNotEnabled`.

### 5.2 Emit a Dedicated `StandaloneTransferEvent`

Avoid overloading `PaymentRecord` with sentinel values. Add a new event:

**`programs/tributary/src/state/events.rs`:**

```rust
#[event]
pub struct StandaloneTransferRecord {
    pub gateway: Pubkey,
    pub from_owner: Pubkey,
    pub recipient: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub gateway_fee: u64,
    pub protocol_fee: u64,
    pub timestamp: i64,
    pub memo: [u8; 64],
}
```

**`programs/tributary/src/instructions/transfer.rs`** — replace the `emit!(PaymentRecord { ... })` block (lines 180-190) with:

```rust
emit!(StandaloneTransferRecord {
    gateway: gateway.key(),
    from_owner: accounts.from.owner,
    recipient: accounts.to.owner.key(),
    token_mint: mint_key,
    amount,
    gateway_fee,
    protocol_fee,
    timestamp: clock.unix_timestamp,
    memo,
});
```

### 5.3 Consider Amount Limits (Optional)

If gateways want to cap standalone transfers, store a `max_transfer_amount: u64` in `PaymentGateway` (use 0 to mean unlimited) and check in the handler:

```rust
if gateway.max_transfer_amount > 0 {
    require!(
        amount <= gateway.max_transfer_amount,
        TributaryError::TransferAmountExceeded
    );
}
```

Add to `PaymentGateway`:

```rust
/// Maximum amount per standalone transfer (0 = unlimited)
pub max_transfer_amount: u64,
```

This requires adjusting `PaymentGateway::SIZE` (replace 117 bytes of padding with `117 - 8 = 109` bytes).

### 5.4 Document the Trust Assumption

Add to the instruction doc comment or project documentation:

> The `transfer` instruction is a **voluntary, fee-bearing** token transfer routed through a gateway. Only the owner of the source token account can invoke it. Gateway and protocol fees apply. It is **not** an admin function. Off-chain indexers should distinguish standalone transfers from policy payments by checking `payment_policy == Pubkey::default()` (current) or the dedicated `StandaloneTransferRecord` event (recommended).

---

## 6. Testing Instructions

### 6.1 Verify Access Control

```typescript
// Must succeed: token account owner calls transfer
await program.methods
    .transfer(new BN(1000), memo)
    .accounts({ from: userTokenAccount, to: recipientTokenAccount, authority: user, ... })
    .signers([user])
    .rpc();

// Must fail: non-owner calls transfer
await expectThrow(
    program.methods
        .transfer(new BN(1000), memo)
        .accounts({ from: userTokenAccount, to: recipientTokenAccount, authority: attacker, ... })
        .signers([attacker])
        .rpc(),
    "Unauthorized"
);
```

### 6.2 Verify Fee Application

```typescript
const amount = new BN(10_000); // 10,000 lamports
const preBalance = await getTokenBalance(recipientTokenAccount);

await program.methods.transfer(amount, memo).accounts({...}).rpc();

// recipient gets amount - gateway_fee - protocol_fee
// With 100 bps protocol fee + gateway fee bps:
const expectedFee = amount.muln((gatewayFeeBps + protocolFeeBps) / 10000);
const expectedRecipient = amount.sub(expectedFee);
assert.equal(await getTokenBalance(recipientTokenAccount), preBalance.add(expectedRecipient).toString());
```

### 6.3 Verify Event Emission

```typescript
const tx = await program.methods.transfer(amount, memo).accounts({...}).rpc();
const events = await program.getEvents(tx);

// Current: PaymentRecord with payment_policy = PublicKey.default
assert.ok(events.some(e => e.name === "PaymentRecord" && e.data.payment_policy.equals(PublicKey.default)));

// After recommendation: StandaloneTransferRecord
assert.ok(events.some(e => e.name === "StandaloneTransferRecord"));
```

### 6.4 Verify Emergency Pause Respected

```typescript
// Pause the program
await program.methods.setEmergencyPause(true).accounts({...}).rpc();

await expectThrow(
    program.methods.transfer(amount, memo).accounts({...}).rpc(),
    "Program is paused"
);
```

### 6.5 Verify Feature Flag (After Recommendation 5.1)

```typescript
// Disable transfer on gateway
await program.methods.updateGatewayFeatureFlags(/* flags without bit 3 */).accounts({...}).rpc();

await expectThrow(
    program.methods.transfer(amount, memo).accounts({...}).rpc(),
    "Standalone transfers not enabled"
);
```

---

## 7. Summary

The `transfer` instruction is **not a vulnerability** — access control is correctly implemented. Only the token account owner can initiate transfers. However, the instruction introduces a **trust surface** that benefits from:

1. A per-gateway feature flag (`FEATURE_TRANSFER`)
2. A dedicated event type (don't overload `PaymentRecord`)
3. Optional amount limits for risk-averse gateway operators
4. Clear documentation that this is voluntary, not admin-initiated

All recommendations are backward-compatible and can be deployed incrementally.
