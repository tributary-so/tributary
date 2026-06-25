# Subscription Payments

Recurring payments at fixed intervals — the bread and butter of SaaS, memberships, and any service with predictable billing.

## Overview

Subscription policies charge a **fixed amount** on a **fixed schedule** (daily, weekly, monthly, etc.). The user sets it up once, and payments execute automatically via Solana's token delegation. No lock-up — funds stay in the user's wallet until each payment is due.

```
User creates policy  -->  Delegates token spending authority
                              |
       +----------+-----------+-----------+----------+
       |          |                       |          |
   Payment 1  Payment 2              Payment N  ...
   $10/month  $10/month              $10/month
   auto-renew auto-renew             auto-renew
```

## When to Use

| Good For                                     | Not Ideal For                       |
| -------------------------------------------- | ----------------------------------- |
| SaaS monthly/annual billing                  | Project-based deliverables          |
| Content memberships (streaming, newsletters) | Variable usage (API calls, compute) |
| Recurring donations                          | One-off payments                    |
| Software licenses & maintenance              | Milestone-based contracts           |
| API access with fixed monthly fees           | Unpredictable billing amounts       |
| Any predictable, repeating payment           |                                     |

## On-Chain Specification

```rust
PolicyType::Subscription {
    amount: u64,               // Fixed payment amount per interval (lamports)
    auto_renew: bool,          // Continue after each payment?
    max_renewals: Option<u32>, // Cap on total payments (None = unlimited)
    payment_frequency: PaymentFrequency,
    next_payment_due: i64,     // Unix timestamp for next execution
    padding: [u8; 97],         // 128-byte alignment
}
```

### PaymentFrequency Enum

```rust
pub enum PaymentFrequency {
    Daily,
    Weekly,
    Monthly,
    Quarterly,
    SemiAnnually,
    Annually,
    Custom(u64),
}
```

### Account Size

Each `Subscription` variant is exactly **128 bytes**, consistent with all other policy types. This enables seamless upgrades without breaking existing policies.

## Creating a Subscription

### Basic Monthly Subscription

```typescript
import { Tributary } from "@tributary-so/sdk";
import { BN } from "@coral-xyz/anchor";
import { createMemoBuffer } from "@tributary-so/sdk";
import { PublicKey, Transaction } from "@solana/web3.js";

const sdk = new Tributary(connection, wallet);

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const recipient = new PublicKey("BxKpT3mZQ5HgeRZFMfWVBpDCmCN8eYwGmCjL7m9mVq");
const gateway = new PublicKey("6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4");

const instructions = await sdk.createSubscription(
  USDC_MINT,
  recipient,
  gateway,
  new BN(10_000_000), // $10.00 per month (USDC has 6 decimals)
  true, // auto-renew
  null, // no max renewals (unlimited)
  { monthly: {} }, // payment frequency
  createMemoBuffer("user_123_pro_plan", 64)
);

const tx = new Transaction().add(...instructions);
const signature = await sendAndConfirm(connection, tx, [wallet.payer]);
```

### Available Payment Frequencies

```typescript
const frequencies = {
  daily: { daily: {} },
  weekly: { weekly: {} },
  biweekly: { biWeekly: {} },
  monthly: { monthly: {} },
  quarterly: { quarterly: {} },
  semiAnnually: { semiAnnually: {} },
  yearly: { yearly: {} },
};
```

### Annual Subscription with Cap

```typescript
// $100/year, max 3 years, then auto-pauses
const instructions = await sdk.createSubscription(
  USDC_MINT,
  recipient,
  gateway,
  new BN(100_000_000), // $100/year
  true, // auto-renew
  3, // max 3 renewals
  { yearly: {} },
  createMemoBuffer("annual_membership_3yr", 64)
);
```

### Custom Start Date

```typescript
const nextMonth = new Date();
nextMonth.setMonth(nextMonth.getMonth() + 1);
nextMonth.setDate(1);
nextMonth.setHours(0, 0, 0, 0);

const instructions = await sdk.createSubscription(
  USDC_MINT,
  recipient,
  gateway,
  new BN(5_000_000), // $5/month donation
  true,
  null,
  { monthly: {} },
  createMemoBuffer("charity_monthly", 64),
  new BN(Math.floor(nextMonth.getTime() / 1000)) // startTime
);
```

## How It Works

### Payment Execution Flow

1. **Policy creation** — user creates policy, delegates token spending authority
2. **Waiting** — `next_payment_due` timestamp hasn't been reached yet
3. **Execution** — when `now >= next_payment_due`, anyone (typically a gateway signer) calls `execute_payment`
4. **Transfer** — amount moves from user's token account to recipient, minus protocol + gateway fees
5. **Advance** — `next_payment_due` advances by one period, `total_payments` increments
6. **Repeat** — if `auto_renew` is true and `max_renewals` hasn't been reached

### Renewal Behavior

| Condition                                | Result                    |
| ---------------------------------------- | ------------------------- |
| `auto_renew = true`, no max              | Continues indefinitely    |
| `auto_renew = true`, `max_renewals = 12` | Pauses after 12 payments  |
| `auto_renew = false`                     | Pauses after next payment |

### Fee Distribution

Each payment splits into:

- **Protocol fee**: 100 bps (1%) -> protocol treasury
- **Gateway fee**: configurable by gateway operator -> gateway fee recipient
- **Net amount**: remainder -> recipient

```
$10.00 payment -> $0.10 protocol + $0.05 gateway + $9.85 recipient
```

## Token Delegation

Subscriptions use SPL Token delegation — the user approves the protocol's PDA to spend up to the calculated amount. Funds **never leave the wallet** until a payment executes.

```typescript
// SDK calculates approval amount automatically:
// - Unlimited: amount * payments_per_year
// - Limited:   amount * max_renewals

// Or provide explicitly:
const instructions = await sdk.createSubscription(
  USDC_MINT,
  recipient,
  gateway,
  new BN(10_000_000),
  true,
  null,
  { monthly: {} },
  createMemoBuffer("pro_plan", 64),
  null, // startTime (defaults to now)
  new BN(120_000_000) // approvalAmount: $120 = $10 x 12 months
);
```

Users can revoke delegation at any time, effectively cancelling the subscription.

## Managing Subscriptions

### Query Status

```typescript
const policy = await sdk.getPaymentPolicy(policyPda);
const sub = policy.policyType.subscription;

console.log("Amount:", sub.amount.toString());
console.log("Next due:", new Date(sub.nextPaymentDue.toNumber() * 1000));
console.log("Auto-renew:", sub.autoRenew);
console.log("Max renewals:", sub.maxRenewals);
console.log("Payments made:", policy.paymentCount.toNumber());

const isDue = Date.now() / 1000 >= sub.nextPaymentDue.toNumber();
```

### Pause / Resume / Cancel

```typescript
// Pause -- stops payments but keeps the policy
await sdk.changePaymentPolicyStatus(tokenMint, policyId, { paused: {} });

// Resume -- reactivates a paused policy
await sdk.changePaymentPolicyStatus(tokenMint, policyId, { active: {} });

// Cancel -- deletes the policy entirely
await sdk.deletePaymentPolicy(tokenMint, policyId);
```

### List All Active Subscriptions

```typescript
const allPolicies = await sdk.getPaymentPoliciesByUserPayment(userPaymentPda);

const activeSubscriptions = allPolicies.filter(
  (p) => "subscription" in p.account.policyType && "active" in p.account.status
);

for (const { publicKey, account } of activeSubscriptions) {
  const sub = account.policyType.subscription;
  const nextDue = new Date(sub.nextPaymentDue.toNumber() * 1000);
  console.log(`${publicKey}: $${sub.amount} due ${nextDue.toLocaleString()}`);
}
```

## Approval Amount Calculation

```typescript
function computePaymentsPerYear(frequency: PaymentFrequency): number {
  switch (Object.keys(frequency)[0]) {
    case "daily":
      return 365;
    case "weekly":
      return 52;
    case "biWeekly":
      return 26;
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "semiAnnually":
      return 2;
    case "yearly":
      return 1;
    default:
      return 12;
  }
}

const paymentsPerYear = computePaymentsPerYear(frequency);
const effectiveRenewals = maxRenewals ?? paymentsPerYear;
const approvalAmount = amount.mul(new BN(effectiveRenewals));
```

## Troubleshooting

| Error                     | Cause                               | Fix                              |
| ------------------------- | ----------------------------------- | -------------------------------- |
| `InsufficientFunds`       | Not enough USDC in wallet           | Fund the wallet or reduce amount |
| `PaymentNotDue`           | `next_payment_due` hasn't passed    | Wait for the scheduled time      |
| `InvalidDelegation`       | Delegated amount too low            | Re-approve with higher amount    |
| Subscription not renewing | `auto_renew = false` or max reached | Check renewal settings           |

## Comparison with Other Policy Types

|                    | Subscription       | Milestone              | Pay-as-you-go      |
| ------------------ | ------------------ | ---------------------- | ------------------ |
| **Amount**         | Fixed per period   | Variable per milestone | Variable per claim |
| **Timing**         | Fixed schedule     | Event/timestamp based  | On-demand          |
| **Flexibility**    | Low                | Medium                 | High               |
| **Predictability** | High               | Medium                 | Low                |
| **Best For**       | Recurring services | Project deliverables   | Variable usage     |
| **User Control**   | Set up once        | Approve per milestone  | Period limits      |
