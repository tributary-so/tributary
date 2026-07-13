# Pay-as-you-go Payments

Usage-based billing where providers claim funds incrementally within predefined limits — for AI agents, APIs, cloud services, and any consumption-based billing.

## Overview

Pay-as-you-go policies let service providers **pull payments on-demand**, up to a maximum chunk amount per claim, within a capped total per billing period. When the period ends, counters reset automatically and a fresh cycle begins.

```
User creates policy  -->  Sets period limit + chunk limit
                              |
       +------- Period 1 -------+  +------- Period 2 -------+
       |          |          |   |  |          |          |
    Claim 1    Claim 2    Claim 3  Claim 4    Claim 5    ...
    $3.50      $7.20      $1.80    $5.00      $2.30
    (chunk: max $10)                (chunk: max $10)
    (period: max $100/mo)           (period resets: fresh $100)
```

## When to Use

| Good For                               | Not Ideal For                   |
| -------------------------------------- | ------------------------------- |
| AI/LLM providers (token-based billing) | Predictable fixed-cost services |
| API services (pay-per-call)            | One-time purchases              |
| Cloud resources (compute, storage)     | Simple monthly subscriptions    |
| SaaS with variable consumption         | Project-based deliverables      |
| Any service with unpredictable usage   | Fixed-price contracts           |
| Micro-payments with rate limits        |                                 |

## On-Chain Specification

```rust
PolicyType::PayAsYouGo {
    max_amount_per_period: u64,     // Total budget per billing period (lamports)
    max_chunk_amount: u64,          // Max per individual claim (lamports)
    period_length_seconds: u64,     // Duration of each period (seconds)
    current_period_start: i64,      // When current period started (unix timestamp)
    current_period_total: u64,      // Amount claimed so far in current period
    expiry_date: Option<i64>,       // Optional overall expiry; None = never (ADR-0024)
    padding: [u8; 79],              // 128-byte alignment
}
```

### Key Fields

| Field                   | Description                                                                                                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `max_amount_per_period` | Ceiling for total claims within one period. Resets when period rolls over.                                                                                                                                  |
| `max_chunk_amount`      | Maximum the provider can claim in a single `execute_payment` call. Prevents large unexpected pulls.                                                                                                         |
| `period_length_seconds` | Billing cycle duration. Any value in seconds — hourly, daily, weekly, monthly, etc.                                                                                                                         |
| `current_period_start`  | Timestamp when the current period began. Used to calculate period expiry.                                                                                                                                   |
| `current_period_total`  | Running total of claims in the current period. Checked against `max_amount_per_period` on each claim.                                                                                                       |
| `expiry_date`           | Optional overall expiration (ADR-0024). `None` = never expires; `Some(ts)` rejects execution once `current_time > ts` (boundary `<=` permitted). Orthogonal to the period cap — whichever trips first wins. |

### Account Size

Each `PayAsYouGo` variant is exactly **128 bytes**, consistent with all other policy types.

## Creating a Pay-as-you-go Policy

### Basic Example — AI API Billing

```typescript
import { Tributary } from "@tributary-so/sdk";
import { BN } from "@coral-xyz/anchor";
import { createMemoBuffer } from "@tributary-so/sdk";
import { PublicKey, Transaction } from "@solana/web3.js";

const sdk = new Tributary(connection, wallet);

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const provider = new PublicKey("BxKpT3mZQ5HgeRZFMfWVBpDCmCN8eYwGmCjL7m9mVq");
const gateway = new PublicKey("6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4");

const instructions = await sdk.createPayAsYouGo(
  USDC_MINT,
  provider, // recipient (the service provider)
  gateway,
  new BN(100_000_000), // max $100 per month
  new BN(10_000_000), // max $10 per claim
  new BN(86400 * 30), // 30-day period
  createMemoBuffer("openai_api_user123", 64)
);

const tx = new Transaction().add(...instructions);
const signature = await sendAndConfirm(connection, tx, [wallet.payer]);
```

### Conservative vs Aggressive Limits

```typescript
// Conservative -- low risk, small frequent payments
const conservative = {
  maxAmountPerPeriod: new BN(10_000_000), // $10/month cap
  maxChunkAmount: new BN(1_000_000), // $1 max per claim
  periodLength: new BN(86400 * 30), // monthly
};

// Aggressive -- higher limits, larger claims
const aggressive = {
  maxAmountPerPeriod: new BN(100_000_000), // $100/month cap
  maxChunkAmount: new BN(25_000_000), // $25 max per claim
  periodLength: new BN(86400 * 7), // weekly
};
```

### Period Length Options

```typescript
const periods = {
  hourly: new BN(3600), // 1 hour
  daily: new BN(86400), // 1 day
  weekly: new BN(86400 * 7), // 7 days
  monthly: new BN(86400 * 30), // 30 days
  quarterly: new BN(86400 * 90), // 90 days
  custom: new BN(whatever_you_want),
};
```

### Optional Overall Expiry (ADR-0024)

Pass an `expiryDate` to cap the authorization with a hard deadline, independent
of the rolling period cap. `null`/omitted = never expires (the default).

```typescript
// $100/month, $10/chunk, but the whole authorization stops after 90 days.
const ninetyDays = Math.floor(Date.now() / 1000) + 86400 * 90;

const instructions = await sdk.createPayAsYouGo(
  USDC_MINT,
  provider,
  gateway,
  new BN(100_000_000), // max/period
  new BN(10_000_000), // max/chunk
  new BN(86400 * 30), // 30-day period
  memo,
  undefined, // approvalAmount (auto)
  undefined, // referralCode
  new BN(ninetyDays) // expiryDate — rejects execution once current_time > expiry
);
```

Once `current_time > expiry_date`, both `execute_payment` and
`execute_composable` fail with `TributaryError::PolicyExpired`. The boundary
`current_time == expiry` is permitted. To reclaim the delegate approval after
expiry, call `delete_payment_policy`.

## How It Works

### Provider Claims

The service provider (or their automated system) calls `execute_payment` when usage thresholds are met:

```typescript
const instructions = await sdk.executePayment(
  policyPda,
  provider, // recipient
  USDC_MINT,
  gateway,
  new BN(7_500_000) // claiming $7.50 for recent usage
);

const tx = new Transaction().add(...instructions);
await sendAndConfirm(connection, tx, [gatewaySigner]);
```

### Validation & Execution

The protocol validates **before** transferring:

1. **Chunk limit**: `payment_amount <= max_chunk_amount`
2. **Period limit**: `current_period_total + payment_amount <= max_amount_per_period`
3. **Period expiry**: if `now >= current_period_start + period_length_seconds`, reset counters first

### Automatic Period Reset

When the current time exceeds `current_period_start + period_length_seconds`:

- `current_period_total` resets to `0`
- `current_period_start` updates to the current timestamp
- A fresh billing cycle begins with full limits

```
Period 1: claimed $45 of $100
  |--- period_length expires ---|
Period 2: fresh $100 limit, claimed $0
```

## Token Delegation

The approval amount is calculated to cover a reasonable number of periods:

```typescript
// SDK calculates: maxAmountPerPeriod * periods_to_cover
// Default: covers enough for the initial period + buffer

// Or provide explicitly:
const instructions = await sdk.createPayAsYouGo(
  USDC_MINT,
  provider,
  gateway,
  new BN(100_000_000), // $100/period
  new BN(10_000_000), // $10/chunk
  new BN(86400 * 30), // 30 days
  createMemoBuffer("api_billing", 64),
  new BN(300_000_000) // approvalAmount: $300 = 3 months buffer
);
```

## Managing Pay-as-you-go Policies

### Query Status

```typescript
const policy = await sdk.getPaymentPolicy(policyPda);
const payg = policy.policyType.payAsYouGo;

console.log("Max per period:", payg.maxAmountPerPeriod.toString());
console.log("Max per chunk:", payg.maxChunkAmount.toString());
console.log("Period length:", payg.periodLengthSeconds.toString(), "seconds");
console.log(
  "Period started:",
  new Date(payg.currentPeriodStart.toNumber() * 1000)
);
console.log("Period used:", payg.currentPeriodTotal.toString());

const remaining =
  payg.maxAmountPerPeriod.toNumber() - payg.currentPeriodTotal.toNumber();
const periodEnd = new Date(
  (payg.currentPeriodStart.toNumber() + payg.periodLengthSeconds.toNumber()) *
    1000
);

console.log(`Remaining this period: $${remaining / 1e6}`);
console.log(`Period ends: ${periodEnd.toLocaleString()}`);
```

### Provider-side Claim Check

```typescript
async function canClaim(
  sdk: Tributary,
  policyPda: PublicKey,
  amount: number
): Promise<boolean> {
  const policy = await sdk.getPaymentPolicy(policyPda);
  const payg = policy.policyType.payAsYouGo;

  if (amount > payg.maxChunkAmount.toNumber()) return false;

  const remaining =
    payg.maxAmountPerPeriod.toNumber() - payg.currentPeriodTotal.toNumber();
  return amount <= remaining;
}

// Before claiming:
if (await canClaim(sdk, policyPda, 7_500_000)) {
  const instructions = await sdk.executePayment(
    policyPda,
    provider,
    USDC_MINT,
    gateway,
    new BN(7_500_000)
  );
  // ... submit transaction
}
```

### Pause / Resume / Cancel

```typescript
// Pause -- stops all claims
await sdk.changePaymentPolicyStatus(tokenMint, policyId, { paused: {} });

// Resume -- reactivates
await sdk.changePaymentPolicyStatus(tokenMint, policyId, { active: {} });

// Cancel -- deletes policy, revokes delegation
await sdk.deletePaymentPolicy(tokenMint, policyId);
```

## Use Case Examples

### AI Agent Token Billing

```typescript
// LLM provider charges per token batch
await sdk.createPayAsYouGo(
  USDC_MINT,
  llmProvider,
  gateway,
  new BN(50_000_000), // $50/month max
  new BN(5_000_000), // $5 max per batch
  new BN(86400 * 30), // monthly
  createMemoBuffer("llm_api_user_42", 64)
);

// Provider claims after each batch:
await sdk.executePayment(
  policyPda,
  llmProvider,
  USDC_MINT,
  gateway,
  new BN(2_340_000) // $2.34 for 234K tokens
);
```

### REST API Pay-per-call

```typescript
// API gateway charges per 1000 requests
await sdk.createPayAsYouGo(
  USDC_MINT,
  apiProvider,
  gateway,
  new BN(25_000_000), // $25/month max
  new BN(500_000), // $0.50 max per claim
  new BN(86400 * 30), // monthly
  createMemoBuffer("weather_api_pro", 64)
);
```

### Cloud Compute

```typescript
// Compute provider bills hourly usage
await sdk.createPayAsYouGo(
  USDC_MINT,
  cloudProvider,
  gateway,
  new BN(200_000_000), // $200/month max
  new BN(20_000_000), // $20 max per claim
  new BN(86400 * 30), // monthly
  createMemoBuffer("gpu_cluster_proj_x", 64)
);
```

## Best Practices

### For Users (Payment Creators)

- **Start conservative** — set low limits first, increase as trust builds
- **Monitor claims** — track provider behavior and adjust limits accordingly
- **Match period to budget** — align billing periods with your financial cycles
- **Use pause liberally** — if something looks off, pause first, investigate later

### For Providers (Service Providers)

- **Claim reasonably** — don't max out chunks unnecessarily; build user trust
- **Transparent conversion** — clearly show how usage maps to payment amounts
- **Document pricing** — publish your rate card so users can estimate costs
- **Notify on large claims** — give users a heads-up before pulling significant amounts

### Security

- **Rate limiting** — implement reasonable delays between claims
- **Usage proofs** — consider attaching usage receipts to claim memos
- **Emergency pause** — users can pause instantly if they detect abuse
- **Audit trail** — all claims are on-chain with timestamps and amounts

## Troubleshooting

| Error                 | Cause                                             | Fix                                             |
| --------------------- | ------------------------------------------------- | ----------------------------------------------- |
| `InvalidAmount`       | Claim exceeds `max_chunk_amount`                  | Reduce claim amount, or increase chunk limit    |
| `PeriodLimitExceeded` | Period total would exceed `max_amount_per_period` | Wait for period reset, or increase period limit |
| `InvalidDelegation`   | Delegated amount insufficient                     | Re-approve with higher amount                   |
| `PaymentNotDue`       | Likely wrong policy type being called             | Pay-as-you-go doesn't use due dates             |

## Comparison with Other Policy Types

|                       | Subscription       | Milestone              | Pay-as-you-go       | OneTime               | UpTo                     |
| --------------------- | ------------------ | ---------------------- | ------------------- | --------------------- | ------------------------ |
| **Amount**            | Fixed per period   | Variable per milestone | Variable per claim  | Fixed, single fire    | Caller-supplied, ≤ max   |
| **Timing**            | Fixed schedule     | Event/timestamp based  | On-demand           | Scheduled / immediate | `[validAfter, deadline)` |
| **Fires**             | Recurring          | Up to 4 phases         | Many (within caps)  | Exactly once          | Exactly once             |
| **Recipient trigger** | No                 | Per release_condition  | Yes                 | No                    | Yes                      |
| **Zero settle**       | n/a                | n/a                    | Rejected (L-01)     | n/a                   | Allowed                  |
| **Best For**          | Recurring services | Project deliverables   | Variable usage      | Invoices, one-shots   | Usage-based one-shot     |
| **Provider Control**  | None (automatic)   | Claim after approval   | Claim within limits |
