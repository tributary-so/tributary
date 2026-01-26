# Referral Program

Enable viral user acquisition through a simplified referral system where rewards are funded entirely from gateway fees with fixed percentage splits across referral tiers.

!!! tip "Quick Start"
The referral program is **automatically enabled** for all gateways. Users earn rewards for inviting others, and gateways benefit from viral growth.

## Overview

Tributary's referral system creates a **gateway-specific referral ecosystem** where:

- **Users** earn rewards for inviting others to Tributary-enabled businesses
- **Gateways** control their referral budget (0-100% of gateway fees)
- **Rewards** are distributed automatically on each payment
- **The chain** is validated on-chain to prevent fraud

### Key Features

| Feature                 | Description                                               |
| ----------------------- | --------------------------------------------------------- |
| **Gateway-Scoped**      | Each gateway operates as an isolated referral ecosystem   |
| **Perfect Accounting**  | Every dollar is accounted for - no money creation or loss |
| **Configurable Budget** | Gateway operators control referral program size           |
| **Fixed Split**         | Simple 60/30/10% distribution across referral tiers       |
| **On-Chain Validation** | Chain integrity is verified during payment execution      |

## How It Works

### Referral Chain Structure

The referral system uses a **linked list** structure where each referral account points to its referrer:

```
Payer (User who makes payment)
    │
    └── refers to → L1 (Immediate Referrer)
                    │
                    └── refers to → L2 (Who referred L1)
                                    │
                                    └── refers to → L3 (Original Referrer)
                                                            │
                                                            └── refers to → null (Origin)
```

### Account Ordering in Transactions

When a payment is executed, referral accounts are passed via `remaining_accounts` in a specific order:

```typescript
// SDK's getReferralChain() returns accounts in this order:
const chain = await sdk.getReferralChain(payer, gateway);
// Returns: [L1, L2, L3] where:
// - index 0 = L1 (immediate referrer who referred the payer)
// - index 1 = L2 (who referred L1)
// - index 2 = L3 (original referrer who started the chain)
```

!!! important "Critical: Account Order Matters"
The SDK returns `[L1, L2, L3]` but the Rust program **reverses the reward assignment**. This is intentional and follows the spec:

    - `level1_referrer` (60%) = L3 (original referrer - index 2)
    - `level2_referrer` (30%) = L2 (middle - index 1)
    - `level3_referrer` (10%) = L1 (immediate - index 0)

    The terminology "Level 1" means "closest to origin" not "first in array."

### Reward Distribution

For a $100 payment with default settings:

```
$100 Payment
├── Protocol Fee: $1.00 (1%) → Protocol Treasury
├── Gateway Fee: $2.50 (2.5%) → Gateway
│   ├── Referral Pool: $1.25 (50% of gateway fee)
│   │   ├── Level 1 (Original): $0.75 (60%)
│   │   ├── Level 2 (Middle): $0.375 (30%)
│   │   └── Level 3 (Immediate): $0.125 (10%)
│   └── Gateway Business Fee: $1.25 (50%)
└── Recipient: $96.50
```

## User Guide

### Earning Referral Rewards

1. **Create a Subscription**: When you create your first subscription, a referral code is automatically generated
2. **Share Your Code**: Share your 6-character referral code with friends
3. **Earn Rewards**: When someone signs up using your code and makes payments, you earn rewards

### Viewing Your Referrals

```typescript
import { Tributary } from "@tributary-so/sdk";

const sdk = new Tributary(provider, programId);

// Get your referral chain (who referred you)
const chain = await sdk.getReferralChain(myPublicKey, gatewayPDA);
// Returns: [referrerL1, referrerL2, referrerL3] or [null, null, null] if you're an origin
```

### Understanding Your Rewards

| Tier        | Description                                 | Reward               |
| ----------- | ------------------------------------------- | -------------------- |
| **Level 1** | Original referrer (who started the chain)   | 60% of referral pool |
| **Level 2** | Middle of the chain                         | 30% of referral pool |
| **Level 3** | Immediate referrer (who referred the payer) | 10% of referral pool |

## Developer Guide

### SDK Integration

#### Getting the Referral Chain

```typescript
async getReferralChain(
  user: PublicKey,
  gateway: PublicKey
): Promise<(PublicKey | null)[]>
```

Returns a fixed 3-element array where:

- Index 0: Immediate referrer (L1)
- Index 1: Who referred L1 (L2)
- Index 2: Original referrer (L3)

Missing referrers are represented as `null`.

#### Creating a Referral Account

```typescript
async createReferralAccount(
  gateway: PublicKey,
  referralCode: string,  // 6-character alphanumeric
  referrer: PublicKey | null  // null for origin referrers
): Promise<TransactionInstruction>
```

#### Executing Payment with Referrals

```typescript
async executePayment(
  paymentPolicy: PublicKey,
  amount: BN,
  // Optional: pass referrer accounts explicitly
  remainingAccounts?: PublicKey[]
): Promise<TransactionInstruction>
```

The SDK automatically includes referral accounts in `remaining_accounts` when available.

### Understanding Account Ordering

The SDK and Rust program use **different ordering conventions**:

```typescript
// SDK: getReferralChain() traverses bottom-up (payer → origin)
// Returns array in order: [L1, L2, L3]
// L1 = immediate referrer (closest to payer)
// L3 = original referrer (farthest from payer)

const chain = await sdk.getReferralChain(payer, gateway);
// chain = [A, B, C] where:
// - A = L1 (referred payer)
// - B = L2 (referred A)
// - C = L3 (origin, referred by no one)
```

```rust
// Rust: ExecutePayment parses remaining_accounts
// SDK passes [L1, L2, L3] but rewards are reversed:

let level1_referrer = referral_accounts[2]; // L3 (original) → 60%
let level2_referrer = referral_accounts[1]; // L2 (middle)   → 30%
let level3_referrer = referral_accounts[0]; // L1 (immediate) → 10%
```

!!! warning "Common Bug"
If you manually pass accounts in the wrong order, rewards will be assigned incorrectly. Always use `getReferralChain()` to get the correct order.

### Chain Validation

The Rust program validates the chain structure on each payment:

```rust
// Verify L1 refers to L2
if referral_accounts.len() >= 2 {
    let l1_referrer = get_referrer_from_account(remaining_accounts[0]);
    assert_eq!(l1_referrer, referral_accounts[1]);
}

// Verify L2 refers to L3
if referral_accounts.len() >= 3 {
    let l2_referrer = get_referrer_from_account(remaining_accounts[1]);
    assert_eq!(l2_referrer, referral_accounts[2]);
}
```

If validation fails, the transaction reverts with:

```
Error Code: InvalidReferralChainOrdering
```

### Error Codes

| Code                           | Message                                               | Cause                          |
| ------------------------------ | ----------------------------------------------------- | ------------------------------ |
| `InvalidReferralChainOrdering` | Invalid referral chain ordering in remaining_accounts | Accounts passed in wrong order |
| `CircularReferralChain`        | Circular referral chain detected                      | Referrer chain creates a loop  |
| `MaxReferralDepthExceeded`     | Maximum referral chain depth exceeded                 | Chain longer than 3 levels     |

### Testing Considerations

When writing tests for referral functionality:

1. **Create fresh referrers**: Don't reuse referrers from other tests
2. **Set null referrers for origins**: The first referrer in a chain must have `null` as their referrer
3. **Validate chain length**: Tests should verify 0, 1, 2, and 3-level chains

```typescript
// CORRECT: Create fresh referrer with null referrer
const originReferrer = Keypair.generate();
await sdk.createReferralAccount(gateway, "ORIGIN", null);

// WRONG: Reusing existing referrer (may already have a chain)
const badReferrer = existingReferrerWithExistingChain; // Has L2, L3 already!
```

## Gateway Configuration

### Default Settings

| Parameter                 | Default            | Description                             |
| ------------------------- | ------------------ | --------------------------------------- |
| `referral_allocation_bps` | 1250 (50%)         | % of gateway fee allocated to referrals |
| `referral_tiers_bps`      | [6000, 3000, 1000] | 60/30/10% split across tiers            |

### Customizing Referral Settings

```typescript
async updateGatewayReferralSettings(
  gateway: PublicKey,
  settings: {
    referralAllocationBps?: number;  // 0-2500 (0-25%)
    referralTiersBps?: [number, number, number];  // Must sum to 10000
  }
): Promise<TransactionInstruction>
```

!!! tip "Gateway Tip"
Start with conservative referral allocation (e.g., 25%) and increase as you see viral growth.

## Architecture

### Account Structure

```rust
#[account]
#[derive(InitSpace)]
pub struct ReferralAccount {
    pub owner: Pubkey,           // Who owns this referral code
    pub referral_code: [u8; 6],  // 6-character alphanumeric code
    pub referrer: Option<Pubkey>, // Who referred this user (null for origin)
    pub created_at: i64,         // Unix timestamp
    pub total_earned: u64,       // Total rewards earned (in lamports)
    pub bump: u8,                // PDA bump seed
}
```

### PDA Derivation

Referral accounts are gateway-scoped:

```rust
// PDA seeds: ["referral", gateway_pubkey, user_pubkey]
Pubkey::find_program_address(
    &["referral".as_bytes(), gateway.as_ref(), owner.as_ref()],
    program_id
)
```

### Linked List Validation

The system validates the referral chain as a linked list:

1. **Creation Time**: Circular chains are prevented during `create_referral_account`
2. **Payment Time**: Chain ordering is verified during `execute_payment`
3. **Depth Limit**: Maximum 3 levels prevents deep chain attacks

## FAQ

### How are rewards calculated?

For a $100 payment with default settings:

1. Gateway fee = $2.50 (2.5%)
2. Referral pool = $1.25 (50% of gateway fee)
3. Level 1 = $0.75 (60% of pool)
4. Level 2 = $0.375 (30% of pool)
5. Level 3 = $0.125 (10% of pool)

### Can I refer myself?

No. Self-referral attempts are rejected during account creation.

### What happens if a referrer doesn't exist?

The chain is padded with `null` values. For example, if only L1 exists:
`[L1, null, null]`

### How do I disable referrals for my gateway?

Set `referral_allocation_bps` to 0:

```typescript
await sdk.updateGatewayReferralSettings(gatewayPDA, {
  referralAllocationBps: 0,
});
```

### What's the maximum chain depth?

3 levels maximum. This prevents abuse while allowing meaningful viral growth.

## Related Documentation

- [Architecture Overview](./architecture.md)
- [Payment Policies](./subscription-payments.md)
- [SDK Documentation](./architecture.md#sdks)
- [Fees](./fees.md)
- [Smart Contract](./smart-contract.md)
