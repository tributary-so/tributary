# Fees and Account Costs

Tributary has two cost dimensions: **payment fees** (deducted from each transfer) and **rent** (Solana's on-chain storage cost for accounts).

---

## Payment Fees
Every payment executed through Tributary uses a **unified gateway fee model** (ADR-0017): the gateway declares **one total fee** (`gateway_fee_bps`), and the protocol decomposes it into four carve-outs. The protocol's cut is **20% of the gateway fee by default** — not a flat percentage of the payment.

### How the fee decomposes

| Carve-out             | Default share of gateway fee | Range                           | Who Controls                      |
| --------------------- | ---------------------------- | ------------------------------- | --------------------------------- |
| Protocol fee          | 20% (`protocol_share_bps = 2000`) | Fixed at program initialization; overridable per-gateway | Protocol admin |
| Scheduler fee         | Set per gateway              | 0–10,000 bps                    | Gateway authority                 |
| Referral pool         | Set per gateway              | 0–2,500 bps (0–25%)            | Gateway authority                 |
| Gateway residual      | Remainder                    | `total − protocol − scheduler − referral` | Gateway authority          |
| **Gateway fee (total)** | **One number, gateway-set** | **0–10,000 bps (0–100%)**     | **Gateway authority**             |

The four carve-out shares must sum to ≤ 10,000 bps (enforced at every gateway-config write site).

### Fee Distribution

```
$100.00 Payment, 5% gateway fee (500 bps), 10% scheduler, 10% referral

Total fee pool: $5.00 (5% of $100)
├── $1.00 → Protocol Treasury (20% of $5.00 fee pool)
├── $0.50 → Scheduler (10% of $5.00 fee pool — pays the execute signer)
├── $0.50 → Referral pool (10% of $5.00 fee pool, if enabled)
└── $3.00 → Gateway residual (remaining 60% of $5.00 fee pool)

Recipient receives: $95.00
```
Fees are calculated as `(amount * bps) / 10000`, truncating toward zero. Dust from rounding goes to the protocol treasury.

### The "1%" is derived, not fixed

At the **default 20% protocol share** and a **typical 5% gateway fee**, the protocol's effective take is **1% of the payment amount** (`500 bps × 20% = 100 bps = 1%`). But the protocol's absolute take scales with the gateway fee:

| Gateway fee | Protocol share (default 20%) | Effective protocol take |
| ----------- | ---------------------------- | ---------------------- |
| 2.5%        | 20%                          | 0.5% of payment        |
| 5%          | 20%                          | 1% of payment          |
| 10%         | 20%                          | 2% of payment          |

### Custom Protocol Fee

The protocol admin can override the global protocol share on a per-gateway basis via `custom_protocol_share_bps` (requires `FEATURE_CUSTOM_PROTOCOL_FEE` bit set on the gateway). This is useful for special arrangements (e.g., zero protocol fee for strategic partners). When enabled, the custom share replaces the global `protocol_share_bps` for that gateway — it does not stack.

```typescript
// Enable 0% protocol fee for a gateway (admin only)
await sdk.updateGatewayProtocolFee(gatewayAuthority, true, 0);
```

See [Providers](../operate/providers.md) for gateway configuration details.

### Referral Fee Allocation

When a gateway has the referral feature enabled, a portion of the gateway fee is allocated to referral rewards. The gateway authority configures:

- **Referral allocation**: Percentage of gateway fee dedicated to rewards (e.g., 500 bps = 5%)
- **Tier split**: How rewards distribute across up to 3 referral levels (must sum to 10,000 bps)

See [Referral Program](payment-policy/referral-program.md) for the full referral chain mechanics.

---

## Rent and Account Costs

Solana charges rent for on-chain data storage. Tributary creates several PDA accounts per user, each requiring a rent deposit. This section explains who pays, how much, and how rent is reclaimed.

### Who Pays Rent?

The `fee_payer` in the transaction covers the rent deposit at account creation time. Tributary tracks this `rent_payer` on-chain so that when the account is closed, the rent is returned to the original payer — not necessarily the account owner.

### Account Sizes and Costs

| Account           | Approx. Size | Rent Cost (SOL) | Created By            |
| ----------------- | ------------ | --------------- | --------------------- |
| `ProgramConfig`   | ~300 bytes   | ~0.002          | Protocol admin (once) |
| `PaymentGateway`  | ~350 bytes   | ~0.002          | Protocol admin        |
| `UserPayment`     | ~370 bytes   | ~0.0025         | Any fee payer         |
| `PaymentPolicy`   | ~630 bytes   | ~0.004          | Any fee payer         |
| `ReferralAccount` | ~150 bytes   | ~0.001          | Referrer              |

Actual costs vary with rent-exempt minimums. Accounts are rent-exempt at creation.

### Rent Lifecycle

```mermaid
flowchart LR
    A["fee_payer creates<br/>UserPayment or<br/>PaymentPolicy"] -->|"rent deposit<br/>tracked in account"| B["Account Active"]
    B -->|"delete policy<br/>(owner signs)"| C["Rent returned to<br/>stored rent_payer"]
    B -->|"delete user payment<br/>(owner signs,<br/>no active policies)"| D["Rent returned to<br/>stored rent_payer"]
```

#### Creation

When a `UserPayment` or `PaymentPolicy` is created, the `fee_payer` submits the rent deposit. The program stores `fee_payer` as `rent_payer` on the account:

```typescript
// SDK: user pays rent for their own UserPayment
const ix = await sdk.createUserPayment(tokenMint);
// rent_payer = user.publicKey (stored on-chain)
```

A third party (e.g., a payment gateway) can sponsor the rent by being the `fee_payer` in the transaction.

#### Deletion

When an account is closed, the stored `rent_payer` receives the lamports:

- **`delete_payment_policy`**: Owner signs, rent goes to `payment_policy.rent_payer`
- **`delete_user_payment`**: Owner signs, rent goes to `user_payment.rent_payer`. Requires `active_policies_count == 0`.

```typescript
// Delete all policies first
for (const policyId of policyIds) {
  await sdk.deletePaymentPolicy(tokenMint, policyId);
}

// Then delete the user payment account
// (only possible when activePoliciesCount === 0)
```

#### Backwards Compatibility

Accounts created before the `rent_payer` field was introduced have `rent_payer` set to `Pubkey::default()` (all zeros). In this case, the program falls back to returning rent to the `owner` (the signer of the delete transaction). This ensures no rent is lost on legacy accounts.

### Delegation Accounts

The `payments_delegate` PDA does not hold user funds — it's a program-derived authority for SPL Token transfers. No rent is associated with delegate approval; it's an SPL Token operation (`approve`) that costs only the transaction fee.

---

## Account Cleanup Flow

To fully remove a user from the protocol:

```
1. Delete all PaymentPolicy accounts (one per active subscription/milestone/PAYG)
   → Each returns rent to that policy's rent_payer
   → Decrements user_payment.active_policies_count

2. Delete UserPayment account
   → Requires active_policies_count == 0
   → Returns rent to user_payment.rent_payer
```

A user cannot delete their `UserPayment` while any `PaymentPolicy` still references it.

### Example: Full Cleanup via SDK

```typescript
const userPayment = await sdk.getUserPayment(userPaymentPDA);
const totalPolicies = userPayment.createdPoliciesCount;

// Delete all policies (skip already-deleted ones)
for (let id = 1; id <= totalPolicies; id++) {
  const [pda] = derivePolicyPda(userPaymentPda, id);
  if (await sdk.getPaymentPolicy(pda)) {
    await sdk.deletePaymentPolicy(tokenMint, id);
  }
}

// Now safe to delete the user payment
const { address: configPda } = sdk.getConfigPda();
const ix = await program.methods
  .deleteUserPayment()
  .accountsStrict({
    owner: user.publicKey,
    userPayment: userPaymentPda,
    tokenMint,
    rentPayer: user.publicKey,
    config: configPda,
  })
  .instruction();
```

---

## Transaction Costs

Beyond rent, every Tributary instruction incurs Solana's base transaction fee (currently 5,000 lamports per signature). Compute costs are minimal for standard operations.

| Operation             | Signatures | Est. Compute |
| --------------------- | ---------- | ------------ |
| Create user payment   | 1          | ~50k CU      |
| Create payment policy | 1          | ~80k CU      |
| Execute payment       | 1          | ~150k CU     |
| Delete payment policy | 1          | ~30k CU      |
| Delete user payment   | 1          | ~30k CU      |

CU estimates are conservative. Actual usage depends on policy type and referral chain depth.
