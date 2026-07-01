# One-Time Payments

Fixed-amount pull payments that fire exactly once then complete — for invoices, one-shot purchases, conditional payouts, and any payment that needs a full gateway lifecycle without recurrence.

## Overview

A OneTime policy is a **single-shot, fixed-amount pull payment** with the same
gateway machinery as a subscription — PDA, pausability, deletability,
schedulability, fee split, referral rewards, and composable hooks. It is the
right tool when you want "fire this payment once, on schedule or on demand,
through Tributary's fee + referral + composable plumbing" — instead of the
stateless [`transfer`](../accounts-and-pdas.md) instruction which has no
policy account and no lifecycle.

```
User creates policy  -->  amount + due_date + optional expiry_date
                              |
                         (waits until due_date, if set)
                              |
                         execute_payment (once)
                              |
                         status: Active → Completed
                         (re-execution blocked)
```

## When to Use

| Good For                                        | Not Ideal For                         |
| ----------------------------------------------- | ------------------------------------- |
| Invoices payable on a due date                  | Recurring services (use Subscription) |
| One-shot purchases with full fee plumbing       | Multi-claim usage (use Pay-as-you-go) |
| Conditional payouts (e.g. escrow release)       | Multi-phase projects (use Milestone)  |
| Gateway-routed one-time tips / bonuses          | Streaming / per-call metered billing  |
| Composable one-shot payments (Lighthouse-gated) |                                       |

## On-Chain Specification

```rust
PolicyType::OneTime {
    amount: u64,              // fixed payment amount, must be > 0 (lamports)
    due_date: i64,            // earliest execution; <= 0 means immediate
    expiry_date: Option<i64>, // None = never expires; Some(ts) = hard deadline
    padding: [u8; 103],       // 128-byte alignment
}
```

### Key Fields

| Field         | Description                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `amount`      | Fixed amount pulled on execution. Must be `> 0`. The caller cannot override it at run time.             |
| `due_date`    | Earliest execution timestamp. `<= 0` means immediately executable. Lets you schedule a future one-shot. |
| `expiry_date` | Optional hard deadline. `None` means the policy never expires; `Some(ts)` rejects execution after `ts`. |

### Account Size

Each `OneTime` variant is exactly **128 bytes**, consistent with all other
policy types (ADR-0002). The 1-byte enum discriminator is `3`.

## Creating a One-Time Payment

### Basic Example — Invoice Due in 7 Days

```typescript
import { Tributary } from "@tributary-so/sdk";
import { BN } from "@coral-xyz/anchor";
import { createMemoBuffer } from "@tributary-so/sdk";
import { PublicKey, Transaction } from "@solana/web3.js";

const sdk = new Tributary(connection, wallet);

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const merchant = new PublicKey("BxKpT3mZQ5HgeRZFMfWVBpDCmCN8eYwGmCjL7m9mVq");
const gateway = new PublicKey("6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4");

const now = Math.floor(Date.now() / 1000);
const dueIn7Days = new BN(now + 7 * 86400);

const instructions = await sdk.createOneTimePayment(
  USDC_MINT,
  merchant,
  gateway,
  new BN(50_000_000), // $50 invoice
  createMemoBuffer("invoice_2024_001", 64),
  dueIn7Days, // executable starting in 7 days
  null // never expires
);

const tx = new Transaction().add(...instructions);
const signature = await sendAndConfirm(connection, tx, [wallet.payer]);
```

### Immediate vs Scheduled vs Expiring

```typescript
// Immediate — fires the moment the gateway executes it.
await sdk.createOneTimePayment(
  USDC_MINT,
  recipient,
  gateway,
  new BN(10_000_000),
  createMemoBuffer("tip", 64),
  null // dueDate omitted → immediate
);

// Scheduled — waits until dueDate before it can execute.
await sdk.createOneTimePayment(
  USDC_MINT,
  recipient,
  gateway,
  new BN(10_000_000),
  createMemoBuffer("deferred payout", 64),
  new BN(futureTimestamp)
);

// Time-bound — must execute within [dueDate, expiryDate] or it's dead.
await sdk.createOneTimePayment(
  USDC_MINT,
  recipient,
  gateway,
  new BN(10_000_000),
  createMemoBuffer("limited-time offer", 64),
  new BN(now), // due immediately
  new BN(now + 3600) // expires in 1h
);
```

## How It Works

### Execution

A gateway signer (or the user) calls `execute_payment`. The protocol checks:

1. **Status** — policy is `Active` (not `Paused` or `Completed`).
2. **Due date** — if `due_date > 0`, `current_time >= due_date` must hold.
3. **Expiry** — if `expiry_date = Some(ts)`, `current_time <= ts` must hold.

On success, the fixed `amount` is transferred (plus fee split), `payment_count`
increments to `1`, and `status` transitions to `Completed`. **Re-execution is
blocked by the `Active`-only constraint** — single-fire is airtight.

### Authorization

Same as Subscription: the caller must be the `gateway.signer` or the
`user_payment.owner`. The recipient cannot trigger a OneTime payment directly
(only Pay-as-you-go and UpTo allow recipient triggering).

## Managing One-Time Payments

### Query Status

```typescript
const policy = await sdk.getPaymentPolicy(policyPda);
const oneTime = policy.policyType.oneTime;

console.log("Amount:", oneTime.amount.toNumber());
console.log("Due:", new Date(oneTime.dueDate.toNumber() * 1000));
console.log(
  "Expires:",
  oneTime.expiryDate ? new Date(oneTime.expiryDate.toNumber() * 1000) : "never"
);

console.log("Status:", Object.keys(policy.status)[0]);
// "active"    → waiting to fire (or due now)
// "paused"    → owner paused it
// "completed" → fired exactly once, terminal
```

### Lifecycle

```typescript
// Pause while waiting (e.g. dispute the invoice).
await sdk.changePaymentPolicyStatus(tokenMint, policyId, { paused: {} });

// Resume.
await sdk.changePaymentPolicyStatus(tokenMint, policyId, { active: {} });

// Cancel before it fires — revokes delegation and reclaims rent.
await sdk.deletePaymentPolicy(tokenMint, policyId);
```

After completion, the policy remains on-chain in `Completed` state. The owner
can `delete_payment_policy` to reclaim rent; the delegate approval should be
revoked separately if no longer needed.

## Composable Interplay

Because `PolicyType` is shared between `PaymentPolicy` and `ComposablePolicy`
(ADR-0007), OneTime lands in the **composable** family for free:

- **Validation hook (Lighthouse)** — pay once only if an on-chain assertion
  holds (e.g. recipient hot-wallet balance below threshold → top-up).
- **Forward hook (Meteora DLMM)** — pull input token, swap, deliver output
  token — one time.

See the [Composable Policy overview](../composable-policy/overview.md) for
the validation + forward semantics. All composable invariants
(ADR-0008 through ADR-0010) apply unchanged.

## Use Case Examples

### Invoice with Net-30 Terms

```typescript
await sdk.createOneTimePayment(
  USDC_MINT,
  vendor,
  gateway,
  new BN(12_500_000), // $12.5K invoice
  createMemoBuffer("invoice_NET30_001", 64),
  new BN(now + 30 * 86400) // due in 30 days
);
```

### Conditional Payout (Composable + Lighthouse)

```typescript
// Pay a $100 bonus to an agent — but only if their hot-wallet USDC balance
// drops below $50. One-shot, condition-gated, delivered as USDC.
const guard = lighthouse
  .tokenAccount(agentHotWalletAta)
  .amount(50_000_000, "<")
  .build();

// Build a composable OneTime policy with the guard + recipient binding.
// (See the Lighthouse Facade doc for the full flow.)
```

## Best Practices

- **Set `expiry_date` when the offer is time-bound** — an open-ended OneTime
  is fine for invoices, but a stale policy on a deleted gateway can sit
  forever consuming rent.
- **Use OneTime over `transfer` when** you need any of: PDA lifecycle,
  pausability, gateway fee plumbing, referrals, schedulability, or composable
  hooks. Use `transfer` for a one-shot payment with none of those.
- **Delete after completion** to reclaim rent.

## Comparison with Other Policy Types

|                       | Subscription       | Milestone              | Pay-as-you-go      | OneTime                |
| --------------------- | ------------------ | ---------------------- | ------------------ | ---------------------- |
| **Amount**            | Fixed per period   | Variable per milestone | Variable per claim | Fixed, single fire     |
| **Timing**            | Fixed schedule     | Event/timestamp based  | On-demand          | Scheduled or immediate |
| **Fires**             | Recurring          | Up to 4 phases         | Many (within caps) | Exactly once           |
| **Recipient trigger** | No                 | Per release_condition  | Yes                | No                     |
| **Best For**          | Recurring services | Project deliverables   | Variable usage     | Invoices, one-shots    |

## Further Reading

- [ADR-0019 — OneTime policy variant](https://github.com/tributary-so/tributary/blob/develop/apps/docs/adr/0019-onetime-policy-variant.md)
- [Pay-as-you-go](payasyougo.md) — multi-claim usage-based billing
- [UpTo](upto.md) — single-use variable-amount authorization
- [Composable Policy Overview](../composable-policy/overview.md)
