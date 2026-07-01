# UpTo Payments

Single-use, time-bound authorizations to transfer **up to** a maximum amount — where the **actual settled amount is determined at settle time** by the resource server based on real usage. The x402 `upto` primitive.

## Overview

An UpTo policy is a **single-use authorization** that lets a resource server
(the recipient, usually) settle **up to `max_amount`** exactly once, within a
`[valid_after, deadline)` window. The settled amount can be anywhere in
`0..=max_amount` — it is supplied by the caller at execute time, after the
actual usage has been measured. After one settlement, the policy transitions
to `Completed`.

```
User authorizes       -->  max_amount + valid_after + deadline
       |                         |
       |                  (resource consumed; usage measured)
       |                         |
       |                  settleUpTo(actual <= max)
       |                         |
       |                  status: Active → Completed
       |                  (re-settle blocked; authorization consumed)
```

This is the x402 analog of EVM's Permit2 "upto" witness pattern, realized on
Solana via Tributary's PDA-delegate pull-payment model.

## When to Use

| Good For                                         | Not Ideal For                                |
| ------------------------------------------------ | -------------------------------------------- |
| Pay-per-use LLM calls (settle after tokens used) | Fixed-price one-shots (use OneTime)          |
| Compute / bandwidth billing (settle after job)   | Recurring services (use Subscription)        |
| HTTP 402 / x402 facilitator flows                | Multi-claim within a cap (use Pay-as-you-go) |
| Usage-capped single authorization (gas relay)    | Milestone-based escrow (use Milestone)       |
| "Pre-auth hold" style variable settlement        | True streaming                               |

## On-Chain Specification

```rust
PolicyType::UpTo {
    max_amount: u64,     // ceiling on the settlement amount (lamports)
    valid_after: i64,    // earliest settlement; <= 0 means immediate
    deadline: i64,       // hard expiry; MUST be > 0 and > valid_after
    padding: [u8; 104],  // 128-byte alignment
}
```

### Key Fields

| Field         | Description                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `max_amount`  | **Ceiling** on the settlement amount. The settle-time caller cannot exceed it. Must be `> 0`.                        |
| `valid_after` | Earliest settlement timestamp. `<= 0` means immediately settleable.                                                  |
| `deadline`    | Hard expiry. Settlement is rejected when `current_time >= deadline` (strict `<`). Must be `> 0` and `> valid_after`. |

There is **no `settled_amount` field**. The actual settlement is recorded in
`PaymentPolicy.total_paid` (incremented by `execute_payment`) and
`payment_count` goes to `1`.

### Account Size

Each `UpTo` variant is exactly **128 bytes**, consistent with all other
policy types (ADR-0002). The 1-byte enum discriminator is `4`.

### Why `deadline` is mandatory (not `Option`)

Unlike OneTime's optional `expiry_date`, UpTo's `deadline` is a required `i64`.
The x402 spec mandates explicit time bounds for an authorization primitive —
"transfer up to X" without a hard deadline is an open-ended risk.

## Settle Amount Enforcement (the key invariant)

The execute-time gate reads `max_amount` from the **on-chain policy**
(immutable post-create) and enforces:

```
0 <= provided_amount <= max_amount
```

The settle-time caller cannot inflate the ceiling. This satisfies the x402
spec's rule that the facilitator must **re-verify against `permitted.amount`,
not settle-time `requirements.amount`** — automatically, because the max is
committed on-chain at create time and the program reads it back at execute.

### `actual MAY be 0`

A zero settle is explicitly permitted: "no usage → no charge" is a valid
single outcome. No transfer CPI runs for the zero case, but the policy still
transitions to `Completed` — the authorization is consumed. This is distinct
from Pay-as-you-go, which rejects zero chunks (L-01 defense).

## Creating an UpTo Authorization

### Basic Example — LLM Call, Up To $5

```typescript
import { Tributary } from "@tributary-so/sdk";
import { BN } from "@coral-xyz/anchor";
import { createMemoBuffer } from "@tributary-so/sdk";
import { PublicKey, Transaction } from "@solana/web3.js";

const sdk = new Tributary(connection, wallet);

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const llmProvider = new PublicKey("BxKpT3mZQ5HgeRZFMfWVBpDCmCN8eYwGmCjL7m9mVq");
const gateway = new PublicKey("6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4");

const now = Math.floor(Date.now() / 1000);

const instructions = await sdk.createUpToAuthorization(
  USDC_MINT,
  llmProvider,
  gateway,
  new BN(5_000_000), // max $5 authorization
  new BN(now + 3600), // deadline: 1 hour from now
  createMemoBuffer("llm_session_42", 64),
  null // validAfter: immediate
);

const tx = new Transaction().add(...instructions);
const signature = await sendAndConfirm(connection, tx, [wallet.payer]);
```

### Immediate vs Scheduled vs Time-Bound

```typescript
// Immediate — settle any time starting now through deadline.
await sdk.createUpToAuthorization(
  USDC_MINT,
  recipient,
  gateway,
  new BN(5_000_000),
  new BN(now + 3600), // 1h deadline
  createMemoBuffer("immediate", 64),
  null // validAfter omitted → immediate
);

// Scheduled — settle window opens later (e.g. authorize now, usable tomorrow).
await sdk.createUpToAuthorization(
  USDC_MINT,
  recipient,
  gateway,
  new BN(5_000_000),
  new BN(now + 7 * 86400), // 7-day deadline
  createMemoBuffer("scheduled", 64),
  new BN(now + 86400) // validAfter: tomorrow
);
```

## How It Works

### Two-Phase Flow (x402 facilitator)

```
Phase 1 — VERIFY (client presents authorization)
   1. Client creates an UpTo policy on-chain + approves the delegate.
   2. Client sends the creation tx in the Payment header.
   3. Facilitator submits the tx, then verifyUpToAuthorization():
      - policy exists, status Active
      - recipient / gateway / mint match
      - policy.policyType.upTo.maxAmount == requirements.amount (ceiling)
      - valid_after / deadline within acceptable window
   4. Facilitator issues a short-lived JWT (exp = deadline).

Phase 2 — SETTLE (after resource consumption)
   1. Resource server measures usage (tokens / bytes / compute).
   2. Computes actual = min(usage_cost, max_amount).
   3. Calls settleUpTo(policyPda, actual):
      - on-chain re-checks actual <= max_amount (reads from policy)
      - time window still valid (now < deadline)
      - single execute → policy goes Completed
   4. PaymentRecord event emitted with the actual settled amount.
```

### Phase-Dependent `amount`

| Phase  | `X402PaymentRequirements.amount` |
| ------ | -------------------------------- |
| Verify | `max_amount` (the ceiling)       |
| Settle | `actual` (the measured cost)     |

The facilitator **MUST NOT** trust the settle-time `requirements.amount` for
the ceiling — it reads `max_amount` from the on-chain policy. The program does
the same. This is automatic: the max is committed at create and immutable.

### Settling

The recipient (resource server) or the gateway signer settles:

```typescript
// After measuring 2,340,000 lamports of LLM usage ($2.34, well under the $5 max):
const settleInstructions = await sdk.settleUpTo(
  policyPda,
  new BN(2_340_000) // actual, <= max_amount
);
const tx = new Transaction().add(...settleInstructions);
await sendAndConfirm(connection, tx, [recipientKeypair]);
```

### Zero-Amount Settle

```typescript
// No usage happened — settle 0. The authorization is consumed (Completed),
// but no tokens move.
await sdk.settleUpTo(policyPda, new BN(0));
```

## Authorization (Who Can Settle)

UpTo is **recipient-triggerable**, like Pay-as-you-go. Any of:

- the **gateway signer** (trusted facilitator),
- the **user** (owner), or
- the **recipient** (resource server, often the same entity)

may call `execute_payment` for an UpTo policy. Subscription / Milestone /
OneTime do not allow recipient triggering.

## Managing UpTo Policies

### Query Status

```typescript
const policy = await sdk.getPaymentPolicy(policyPda);
const upto = policy.policyType.upTo;

console.log("Max:", upto.maxAmount.toNumber());
console.log("Valid after:", new Date(upto.validAfter.toNumber() * 1000));
console.log("Deadline:", new Date(upto.deadline.toNumber() * 1000));
console.log("Status:", Object.keys(policy.status)[0]);
// "active"    → authorization still consumable
// "paused"    → owner paused it
// "completed" → settled (or zero-settled); terminal
```

### Lifecycle

```typescript
// Pause while the authorization is unused.
await sdk.changePaymentPolicyStatus(tokenMint, policyId, { paused: {} });
await sdk.changePaymentPolicyStatus(tokenMint, policyId, { active: {} });

// Cancel before settlement — revokes delegation and reclaims rent.
await sdk.deletePaymentPolicy(tokenMint, policyId);
```

If `deadline` passes without settlement, the owner can `delete_payment_policy`
to reclaim rent. The authorization cannot be settled after the deadline.

## Composable Interplay

Because `PolicyType` is shared between `PaymentPolicy` and `ComposablePolicy`
(ADR-0007), UpTo lands in the **composable** family for free:

- **Validation hook (Lighthouse)** — settle up to X once, only if an on-chain
  assertion holds (e.g. hot wallet balance below threshold → top-up).
- **Forward hook (Meteora DLMM)** — settle in input token, swap to output
  token on delivery — once.

See the [Composable Policy overview](../composable-policy/overview.md). All
composable invariants (ADR-0008 through ADR-0010) apply unchanged.

## Use Case Examples

### LLM Pay-Per-Session

```typescript
// Authorize up to $5 for a single LLM session, valid for 1 hour.
await sdk.createUpToAuthorization(
  USDC_MINT,
  llmProvider,
  gateway,
  new BN(5_000_000),
  new BN(now + 3600),
  createMemoBuffer("llm_session", 64)
);

// Provider measures actual token cost ($2.34) and settles.
await sdk.settleUpTo(policyPda, new BN(2_340_000));
```

### HTTP 402 / x402 Resource Access

```typescript
// Resource server uses the x402 middleware with the `upto` scheme.
import { createX402Middleware } from "@tributary-so/sdk-x402";

const middleware = createX402Middleware({
  scheme: "x402://upto",
  network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  amount: 1_000_000, // verify-time: ceiling ($1)
  maxAmount: 1_000_000,
  validAfter: now,
  deadline: now + 3600,
  recipient: providerAddress,
  gateway: gatewayAddress,
  tokenMint: USDC_MINT,
  jwtSecret: process.env.JWT_SECRET,
  sdk,
  connection,
});
```

### Compute Job (Composable + Lighthouse)

```typescript
// Authorize up to $10 for a GPU job, but only settle if the job's output hash
// matches an on-chain assertion. Composable UpTo + Lighthouse guard.
const guard = lighthouse
  .accountData(outputHashAccount)
  .equals(expectedHash)
  .build();
// ...build composable UpTo policy with the guard...
```

## Best Practices

- **Set `deadline` tight** — match it to the expected resource-consumption
  window. An open-ended UpTo (`deadline` years out) is a long-lived liability.
- **Approve `max_amount + fee headroom`** as the delegate allowance — gateway
  fees are pulled on top of the gross settle amount.
- **Use UpTo over Pay-as-you-go when** you need single-settlement semantics
  (one shot, then complete). Pay-as-you-go is for multi-claim within period
  caps.
- **Use UpTo over OneTime when** the actual amount isn't known at create time.
  OneTime is fixed-amount; UpTo is variable-amount up to a ceiling.

## Comparison with Other Policy Types

|                       | Subscription       | Milestone              | Pay-as-you-go      | OneTime               | UpTo                     |
| --------------------- | ------------------ | ---------------------- | ------------------ | --------------------- | ------------------------ |
| **Amount**            | Fixed per period   | Variable per milestone | Variable per claim | Fixed, single fire    | Caller-supplied, ≤ max   |
| **Timing**            | Fixed schedule     | Event/timestamp        | On-demand          | Scheduled / immediate | `[validAfter, deadline)` |
| **Fires**             | Recurring          | Up to 4 phases         | Many (within caps) | Exactly once          | Exactly once             |
| **Recipient trigger** | No                 | Per release_condition  | Yes                | No                    | Yes                      |
| **Zero settle**       | n/a                | n/a                    | Rejected (L-01)    | n/a                   | Allowed                  |
| **Best For**          | Recurring services | Project deliverables   | Variable usage     | Invoices, one-shots   | Usage-based one-shot     |

## Further Reading

- [ADR-0020 — UpTo scheme and policy variant](https://github.com/tributary-so/tributary/blob/develop/apps/docs/adr/0020-upto-scheme-and-policy-variant.md)
- [x402 HTTP Payments](../../integration-guide/pull-payments/x402/overview.md) — the facilitator flow
- [OneTime](onetime.md) — fixed-amount single-fire
- [Pay-as-you-go](payasyougo.md) — multi-claim within period caps
- [Composable Policy Overview](../composable-policy/overview.md)
