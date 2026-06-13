---
# tributary-vb3i
title: 'H-02: No Owner Signature on create_user_payment — Griefing Vector'
status: todo
type: task
priority: high
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-13T05:51:21Z
parent: tributary-4kt4
---

# H-02: No Owner Signature on `create_user_payment` — Griefing Vector

| Field          | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| **Severity**   | Medium (Griefing / Design Consideration)                     |
| **File**       | `programs/tributary/src/instructions/create_user_payment.rs` |
| **Function**   | `CreateUserPayment::handler_create_user_payment`             |
| **Program ID** | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6X1Sg42tJ`                 |

---

## Description

The `create_user_payment` instruction does **not require the `owner` account to sign**. The `owner` is declared as a plain `AccountInfo` with no `Signer` constraint:

```rust
// create_user_payment.rs:7-9
/// CHECK: The owner account - does NOT need to sign
#[account()]
pub owner: AccountInfo<'info>,
```

The `UserPayment` PDA is derived deterministically from `[USER_PAYMENT_SEED, owner, token_mint]`. This means:

1. **Anyone** can invoke `create_user_payment` for **any** owner pubkey.
2. The PDA is unique per `(owner, mint)` pair — an attacker cannot create a _different_ account at the same address.
3. The attacker _can_ create the account **before** the legitimate owner does, locking the owner into an account the owner did not initiate.

This is an intentional **gasless onboarding** design — a gateway or relayer can create the `UserPayment` account on behalf of a user without requiring the user's signature. The user only needs to approve a token delegate on their ATA later (which _does_ require their signature via wallet).

However, the lack of any signature or proof-of-intent from the owner introduces a griefing vector.

---

## Attack Scenario

### Step-by-step griefing attack:

1. **Attacker** identifies a target victim's pubkey `V` and the mint `M` they will likely use for subscriptions.

2. **Attacker** calls `create_user_payment` with:

   - `owner = V` (the victim — no signature required)
   - `token_account` = any valid ATA owned by `V` for mint `M` (publicly derivable via `getAssociatedTokenAddress`)
   - `token_mint = M`
   - `fee_payer` = attacker's own wallet (attacker pays rent ~0.002 SOL)

3. The PDA `["user_payment", V, M]` is created. The account now exists with:

   - `owner = V`
   - `rent_payer = attacker_pubkey`
   - `is_active = true`
   - `active_policies_count = 0`
   - `created_policies_count = 0`

4. When the **victim** later attempts to create their own `UserPayment`, the `init` constraint will **fail** because the account already exists:

   ```
   Error: AccountAlreadyInitialized
   ```

5. The victim must now either:
   - Use the existing account (which has attacker-controlled `rent_payer`)
   - Contact the protocol team for manual intervention
   - Close the account first (which requires `owner` signature via `delete_user_payment`, but only works if `active_policies_count == 0`)

### What the attacker achieves:

- The victim's `UserPayment` account is created with the **attacker as `rent_payer`**.
- If a gateway or relayer subsequently creates payment policies for this user, the `created_policies_count` starts from 0 — no data corruption, but the user never consented to this account existing.
- The attacker can later close the account (if no policies are active) and reclaim the rent — effectively cycling the griefing attack.

### What the attacker CANNOT achieve:

- Cannot set an arbitrary `token_account` — the constraint `token_account.owner == owner.key()` ensures the ATA must belong to the victim.
- Cannot create payment policies — `create_payment_policy` also does not require owner signature, but policies require a valid gateway and only trigger payments if the user has approved a delegate on their ATA.
- Cannot steal funds — the delegate approval step requires the user's wallet signature via SPL Token's `approve` instruction.

---

## Impact

| Aspect                | Assessment                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Fund theft**        | None — delegate approval is a hard safety gate. No funds can move without the owner's off-chain signature.  |
| **Data integrity**    | Minimal — the `UserPayment` fields are set correctly even when created by an attacker.                      |
| **User experience**   | Moderate degradation — victim encounters `AccountAlreadyInitialized` error when trying to onboard normally. |
| **Denial of service** | Low-to-medium — victim can delete and re-create, but this costs an extra transaction.                       |
| **Rent extraction**   | Negligible — attacker pays rent (~0.002 SOL) to create the account, so griefing costs the attacker money.   |

The severity is **Medium** because:

- No funds are at risk (delegate approval is required before any transfer).
- The griefing requires the attacker to spend SOL on rent.
- The victim has a self-service recovery path (`delete_user_payment` → `create_user_payment`).

---

## Proof of Concept

The following test demonstrates the griefing attack. Add to `tests/tributary.test.ts`:

```typescript
it("H-02: Anyone can create UserPayment for another user (griefing)", async () => {
  // Setup: victim has a token account but hasn't created UserPayment yet
  const victim = anchor.web3.Keypair.generate();
  const attacker = anchor.web3.Keypair.generate();

  // Airdrop SOL to both
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(
      victim.publicKey,
      2 * LAMPORTS_PER_SOL
    )
  );
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(
      attacker.publicKey,
      2 * LAMPORTS_PER_SOL
    )
  );

  // Create token account for victim
  const victimAta = await createAssociatedTokenAccount(
    provider.connection,
    victim,
    usdcMint,
    victim.publicKey
  );

  // Derive UserPayment PDA
  const [userPaymentPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_payment"),
      victim.publicKey.toBuffer(),
      usdcMint.toBuffer(),
    ],
    programId
  );

  // === ATTACK: Attacker creates UserPayment for victim ===
  await program.methods
    .createUserPayment()
    .accounts({
      owner: victim.publicKey, // Not signed!
      userPayment: userPaymentPda,
      tokenAccount: victimAta,
      tokenMint: usdcMint,
      config: configPda,
      feePayer: attacker.publicKey, // Attacker pays
      systemProgram: SystemProgram.programId,
    })
    .signers([attacker]) // Only attacker signs
    .rpc();

  // Verify account was created with attacker as rent_payer
  const userPayment = await program.account.userPayment.fetch(userPaymentPda);
  assert.equal(userPayment.owner.toBase58(), victim.publicKey.toBase58());
  assert.equal(userPayment.rentPayer.toBase58(), attacker.publicKey.toBase58());

  // === VICTIM TRIES: Creating their own UserPayment fails ===
  try {
    await program.methods
      .createUserPayment()
      .accounts({
        owner: victim.publicKey,
        userPayment: userPaymentPda, // Already exists!
        tokenAccount: victimAta,
        tokenMint: usdcMint,
        config: configPda,
        feePayer: victim.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([victim])
      .rpc();
    assert.fail("Should have thrown AccountAlreadyInitialized");
  } catch (err: any) {
    assert.include(err.message, "already in use"); // or "AccountAlreadyInitialized"
  }

  // === RECOVERY: Victim can delete and re-create ===
  await program.methods
    .deleteUserPayment()
    .accounts({
      owner: victim.publicKey,
      userPayment: userPaymentPda,
      tokenMint: usdcMint,
      rentPayer: attacker.publicKey, // Rent goes back to attacker
      config: configPda,
    })
    .signers([victim])
    .rpc();

  // Now victim can create their own
  await program.methods
    .createUserPayment()
    .accounts({
      owner: victim.publicKey,
      userPayment: userPaymentPda,
      tokenAccount: victimAta,
      tokenMint: usdcMint,
      config: configPda,
      feePayer: victim.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([victim])
    .rpc();
});
```

---

## Patch Options

### Option A: Require owner signature (simplest, breaks gasless onboarding)

**Change:** Add `Signer` constraint to `owner` in `CreateUserPayment`.

```rust
// programs/tributary/src/instructions/create_user_payment.rs

#[derive(Accounts)]
pub struct CreateUserPayment<'info> {
-   /// CHECK: The owner account - does NOT need to sign
-   #[account()]
-   pub owner: AccountInfo<'info>,
+   pub owner: Signer<'info>,

    #[account(
        init,
        payer = fee_payer,
        space = UserPayment::SIZE,
        seeds = [USER_PAYMENT_SEED, owner.key().as_ref(), token_mint.key().as_ref()],
        bump
    )]
    pub user_payment: Account<'info, UserPayment>,
```

No other code changes needed — the handler already uses `ctx.accounts.owner.key()` which works identically with `Signer`.

**Pros:**

- One-line fix, trivially correct.
- Eliminates the griefing vector entirely.

**Cons:**

- Breaks **gasless onboarding** — gateways can no longer pre-create `UserPayment` accounts for users.
- Every user must sign a transaction to create their own account, adding friction to the onboarding flow.
- If any frontend or SDK assumes gasless creation, it must be updated.

---

### Option B: Add nonce/hash to PDA seed (preserves gasless, prevents pre-creation)

**Change:** Introduce an optional `creation_seed` parameter. Only accounts created with the seed can be used, and the seed is provided by the owner or derived from a commitment.

```rust
// programs/tributary/src/state/user_payment.rs
// Add a field to store the creation seed

pub struct UserPayment {
    // ... existing fields ...
    pub creation_seed: [u8; 32],   // NEW: hash commitment
    // Reduce padding by 32 bytes
    pub padding: [u8; 177],        // was 209
}

impl UserPayment {
    pub const SIZE: usize = 8 +
        32 + // owner
        32 + // token_account
        32 + // token_mint
        4 +  // active_policies_count
        4 +  // created_policies_count
        4 +  // active_composable_count
        4 +  // created_composable_count
        1 +  // delegate_version
        8 +  // created_at
        8 +  // updated_at
        1 +  // is_active
        1 +  // bump
        32 + // rent_payer
        32 + // creation_seed          <-- NEW
        177; // padding (was 209)
}
```

```rust
// programs/tributary/src/instructions/create_user_payment.rs

#[derive(Accounts)]
pub struct CreateUserPayment<'info> {
    /// CHECK: The owner account - does NOT need to sign
    #[account()]
    pub owner: AccountInfo<'info>,

    #[account(
        init,
        payer = fee_payer,
        space = UserPayment::SIZE,
        seeds = [
            USER_PAYMENT_SEED,
            owner.key().as_ref(),
            token_mint.key().as_ref(),
            creation_seed.as_ref(),   // NEW: seed makes PDA unpredictable
        ],
        bump
    )]
    pub user_payment: Account<'info, UserPayment>,

    // ... rest unchanged ...
}

pub fn handler_create_user_payment(
    ctx: Context<CreateUserPayment>,
    creation_seed: [u8; 32],         // NEW parameter
) -> Result<()> {
    // ... existing validation ...

    user_payment.creation_seed = creation_seed;
    // ... rest unchanged ...
}
```

**Important:** This changes the PDA derivation, which means:

- All downstream instructions that reference `UserPayment` PDAs must include `creation_seed` in their seed derivation.
- The `create_payment_policy` handler must look up the stored seed or receive it as a parameter.
- All existing accounts would need migration.
- The SDK's PDA derivation helpers must be updated.

**Pros:**

- Preserves gasless onboarding — a relayer can still create accounts.
- An attacker cannot predict the PDA without knowing the seed.
- If the seed is a hash commitment (e.g., `hash(owner_secret || mint)`), only someone with the secret can derive the correct PDA.

**Cons:**

- **High complexity** — every PDA derivation in the program must change.
- **Breaking change** — all existing accounts become invalid.
- The seed must be communicated out-of-band (e.g., via a deep link or QR code), adding UX complexity.
- Migration path required for deployed instances.

---

### Option C: Accept as documented design decision (recommended)

**Change:** No code changes. Add documentation and optionally a defensive check.

The griefing vector exists but is **self-limiting** because:

1. **Delegate approval is the real security gate.** No payment can execute without the owner calling `token.approve(delegate, amount)` on their ATA — which requires a wallet signature. An attacker-created `UserPayment` with no delegate approval is inert.

2. **Policies also lack owner signature.** `create_payment_policy` similarly does not require the `user` to sign. This is consistent with the gasless design — the entire flow (create user payment → create policy → approve delegate) is designed so only the delegate approval requires user interaction.

3. **The attack costs the attacker money.** Creating a `UserPayment` account costs ~0.002 SOL in rent. Griefing at scale is economically disincentivized.

4. **Self-service recovery exists.** The victim can call `delete_user_payment` (requires `owner` signature, valid when `active_policies_count == 0`) and then re-create. Two transactions, ~5 seconds.

5. **The `rent_payer` field makes the attacker recoverable.** When the victim deletes the account, the rent goes to the stored `rent_payer` (the attacker), not the victim. The attacker effectively loans the victim 0.002 SOL.

6. **No griefing amplification.** The attacker cannot attach active policies without a gateway's cooperation, and policies without delegate approval are harmless.

**Optional defensive hardening** — add a check that the `token_account` has been recently interacted with, or log a warning event:

```rust
// programs/tributary/src/instructions/create_user_payment.rs
// Optional: emit a distinctive event when creator != owner

pub fn handler_create_user_payment(ctx: Context<CreateUserPayment>) -> Result<()> {
    // ... existing code ...

    // Optional: flag third-party creation for monitoring
    if ctx.accounts.fee_payer.key() != ctx.accounts.owner.key() {
        msg!(
            "INFO: UserPayment created by third party. fee_payer: {:?}, owner: {:?}",
            ctx.accounts.fee_payer.key(),
            ctx.accounts.owner.key(),
        );
    }

    // ... rest unchanged ...
}
```

**Pros:**

- No breaking changes, no migration.
- Preserves gasless onboarding exactly as designed.
- The actual security model (delegate approval) is sound.
- Documentation makes the tradeoff explicit for auditors and integrators.

**Cons:**

- The griefing vector technically remains.
- Requires clear documentation so users and integrators understand the design intent.

---

## Recommendation

**Accept Option C.** The gasless onboarding design is intentional, consistent across both `create_user_payment` and `create_payment_policy`, and the actual security boundary is the SPL Token `approve` call. The griefing vector is low-impact, self-limiting, and has a trivial recovery path.

Add the following to documentation:

```markdown
## Design Decision: Unsigned UserPayment Creation

The `create_user_payment` instruction intentionally does not require the
owner's signature. This enables gasless onboarding where a gateway or
relayer creates the account on the user's behalf.

**Security implication:** Any party can create a `UserPayment` for any
owner/mint pair. This is safe because:

1. No funds can move without the owner's explicit `approve()` on their ATA.
2. The account fields are set deterministically — no attacker-controlled values.
3. The victim can delete and re-create the account in two transactions.

If gasless onboarding is not required, add `Signer` to the `owner` account.
```

If the team decides the griefing UX impact is unacceptable despite the low severity, Option A (require signature) is the correct fallback — it's a one-line change with no migration cost, at the expense of gasless onboarding.

---

## Testing Instructions

### Verify the vulnerability exists:

1. Run the PoC test above:

   ```bash
   anchor test -- --grep "H-02"
   ```

2. Confirm that:
   - An attacker can create `UserPayment` for a victim (test passes without error).
   - The victim's subsequent creation attempt fails with `AccountAlreadyInitialized`.
   - The victim can delete (with owner signature) and re-create.

### Verify Option A patch:

1. Apply the `Signer` constraint to `owner`.
2. Re-run the PoC — the attacker's creation should now fail:
   ```
   Error: Signature verification failed
   ```
3. Run the full test suite to confirm no regressions:
   ```bash
   anchor test
   ```

### Verify recovery path (current code):

1. Create a `UserPayment` for a victim via third party.
2. Attempt normal onboarding — confirm `AccountAlreadyInitialized`.
3. Call `delete_user_payment` as the owner.
4. Call `create_user_payment` as the owner — confirm success.
5. Create a policy, approve delegate, execute payment — confirm the full flow works.

### Gasless onboarding test (current design):

1. As a relayer (no owner keypair), call `create_user_payment` for a new user.
2. As the user, call `create_payment_policy` for a gateway.
3. As the user, call `token.approve(delegate, amount)`.
4. As the gateway signer, call `execute_payment`.
5. Confirm the payment succeeds — the gasless flow is end-to-end functional.
