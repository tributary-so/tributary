---
# tributary-3sv3
title: 'x402 ''upto'' scheme: variable-amount single-settlement authorization (UpTo policy variant + facilitator)'
status: todo
type: epic
priority: high
created_at: 2026-06-30T14:17:10Z
updated_at: 2026-06-30T14:17:10Z
---

# x402 `upto` scheme — variable-amount single-settlement authorization

## Problem

Implement the x402 `upto` payment scheme: a **single-use, time-bound
authorization to transfer up to a maximum amount**, where the **actual
settled amount is determined at settle time** by the resource server based on
real usage (LLM tokens, bytes transferred, compute units). The settled amount
MUST be `<= max`, MAY be `0`, and the authorization is consumed after one
settlement.

This is the x402 analog of EVM's Permit2 "upto" witness pattern, realized on
Solana via Tributary's PDA-delegate pull-payment model.

### Why a new primitive (not reusable existing ones)

| Existing variant                | Why it doesn't fit `upto`                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `PayAsYouGo`                    | **Multi-settlement** within period caps. `upto` is strictly single-use (spec: "Out of Scope: Multi-settlement / streaming"). |
| `OneTime` (epic tributary-w1h2) | **Fixed amount** known at create time. `upto`'s whole point is the amount is unknown until after resource consumption.       |
| `Subscription` / `Milestone`    | Recurring / escrow — wrong shape entirely.                                                                                   |
| `transfer` (ADR-0004)           | Stateless — no replay protection. Spec mandates on-chain single-use enforcement.                                             |

`upto` = **single-shot PayAsYouGo with a hard deadline and a caller-determined
settlement amount `<= max`.** Genuinely a new PolicyType variant.

## x402 scheme properties → Tributary enforcement

| x402 `upto` MUST property                                                                | Tributary enforcement                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single-use** (settled at most once)                                                    | `PolicyStatus: Active -> Completed` after one execute; re-exec blocked by existing `status == Active` gate. Airtight, same mechanism as OneTime.                                                |
| **Time-bound** (`validAfter` + `deadline`)                                               | On-chain `valid_after` + `deadline` fields, enforced in `validate_policy_execution`.                                                                                                            |
| **Recipient binding**                                                                    | `PaymentPolicy.recipient` baked into the PDA; execute validates `recipient_token_account.owner == recipient`.                                                                                   |
| **Max amount enforcement** (`settled <= max`)                                            | On-chain `max_amount` field; execute reads it from the policy (NOT from the caller's claim), checks `provided_amount <= max_amount`.                                                            |
| **Settled MAY be 0**                                                                     | `provided_amount == 0` allowed (no transfer CPI for the zero case).                                                                                                                             |
| **Phase-dependent `amount`** (verify=max, settle=actual)                                 | Off-chain (x402 layer): verify reads `max_amount` from policy; settle passes `actual` as `provided_amount` to `execute_payment`. On-chain is phase-agnostic — it just enforces `actual <= max`. |
| **Facilitator re-verifies against `permitted.amount`, not settle `requirements.amount`** | Automatic: the program reads `max_amount` from the on-chain policy, which is immutable post-create. The settle-time caller cannot inflate it.                                                   |

## Variant layout (128 bytes payload)

```rust
UpTo {
    max_amount: u64,     // 8  — ceiling on the settlement amount (the signed authorization)
    valid_after: i64,    // 8  — earliest settlement; <= 0 means immediate (x402 `validAfter`)
    deadline: i64,       // 8  — hard expiry; MUST be > valid_after and > 0 (x402 `deadline`)
    padding: [u8; 104],  // 104
}
// Total payload: 128 (matches ADR-0002 invariant). Discriminator = 4.
```

`deadline` is **required** (not `Option`) — the x402 spec mandates explicit
time bounds. `valid_after` may be `<= 0` to mean "immediate", mirroring the
`due_date <= 0` convention from the OneTime epic. No `settled_amount` field:
the actual settlement is recorded in `PaymentPolicy.total_paid` (already
incremented by `execute_payment`) and `payment_count` goes to 1.

## Semantics

### Create-time validation (`policies/up_to.rs::validate_up_to_policy`)

- `require!(max_amount > 0, InvalidAmount)` — a zero-max authorization is meaningless.
- `require!(deadline > 0, InvalidPaymentDueDate)` — deadline is mandatory.
- `if valid_after > 0 { require!(deadline > valid_after, InvalidPaymentDueDate) }`.

### Execute-time gating (`shared/schedule.rs::validate_policy_execution`, new arm)

```rust
PolicyType::UpTo { max_amount, valid_after, deadline, .. } => {
    // Settlement amount is caller-supplied (determined by resource server
    // after usage). Unlike Subscription/OneTime (fixed), like PayAsYouGo (chunk).
    let actual = provided_amount.ok_or(TributaryError::InvalidAmount)?;
    require!(actual <= *max_amount, TributaryError::InvalidAmount);
    // actual MAY be 0 (spec: no charge if no usage occurred) — no `actual > 0` check.
    if *valid_after > 0 {
        require!(current_time >= *valid_after, TributaryError::PaymentNotDue);
    }
    require!(current_time <= *deadline, TributaryError::PolicyExpired);
    Ok(actual)
}
```

### Schedule advancement (`shared/schedule.rs::advance_policy`, new arm)

```rust
PolicyType::UpTo { .. } => Ok(true),  // always terminal after one settlement
```

Single-use guaranteed by the `Active -> Completed` transition. Identical to
the OneTime arm.

### Authorization — recipient-triggerable (like PayAsYouGo)

The resource server / facilitator settles with the actual amount. Extend the
recipient-triggerable set in `execute_payment.rs:176-180` to include `UpTo`:

```rust
if fee_payer_key == payment_policy.recipient {
    if !matches!(&payment_policy.policy_type,
        PolicyType::PayAsYouGo { .. } | PolicyType::UpTo { .. })
    {
        return Err(TributaryError::Unauthorized.into());
    }
}
```

Gateway signer and owner can also settle (same as all policies).

### Composable interplay

`UpTo` in a `ComposablePolicy` = conditional usage-based one-shot settlement
(settle up to X USDC once, only if a Lighthouse assertion holds, optionally
swapping to an output token via DLMM). Inherits all composable semantics
unchanged — free win from the shared PolicyType enum.

## x402 protocol layer (off-chain, `packages/sdk-x402/`)

The on-chain variant is necessary but not sufficient. The x402 scheme has a
two-phase facilitator flow that lives in the SDK/x402 package.

### New scheme identifier

Add `"x402://upto"` to `X402Scheme` (follows the existing `x402://payg` /
`x402://prepaid` naming).

### Two-phase flow

**Phase 1 — Verify (client presents authorization):**

1. Client creates an `UpTo` policy on-chain (max_amount, valid_after, deadline, recipient, gateway) + approves the UserPayment delegate.
2. Client sends the policy creation tx in the `Payment` header.
3. Facilitator submits the tx, then `verifyUpToAuthorization()`:
   - Policy exists, status `Active`.
   - `policy.recipient == expected`, `policy.gateway == expected`, mint matches.
   - `policy.policyType.upTo.maxAmount == requirements.amount` (at verify, `amount` = max).
   - `valid_after` / `deadline` within acceptable window.
4. Facilitator issues a JWT scoped to this authorization. Resource access begins.

**Phase 2 — Settle (after resource consumption):**

1. Resource server measures usage (tokens/bytes/compute) via `metering.ts`.
2. Resource server computes `actual = min(usage_cost, max_amount)`.
3. Facilitator calls `settleUpTo(policyPda, actual)`:
   - `actual <= max_amount` (re-checked on-chain).
   - Time window still valid (`now <= deadline`).
   - Single execute → policy goes `Completed`.
4. `PaymentRecord` event emitted with the actual settled amount.

### Phase-dependent `amount` (spec compliance)

- Verify-time `X402PaymentRequirements.amount` = `max_amount` (the authorization ceiling).
- Settle-time `X402PaymentRequirements.amount` = actual settle amount.
- The facilitator MUST NOT trust the settle-time `requirements.amount` for the
  ceiling — it reads `max_amount` from the on-chain policy (which the program
  also does). This is the spec's "re-verify against `permitted.amount`" rule,
  satisfied automatically because the max is committed on-chain at create.

### Metering integration (`src/metering.ts`)

The actual settle amount is derived from `UsageTracker`:

```typescript
const actual = Math.min(
  usageTracker.totalCost(requestId),
  upToPolicy.maxAmount
);
await settleUpTo(sdk, policyPda, actual);
```

Existing `TokenMeter` / `ComputeMeter` / `UsageTracker` feed the settle amount
directly — no new metering concepts needed.

## Touch points

### Rust program (on-chain `UpTo` variant)

| File                                              | Change                                                                                                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state/payment_policy.rs:46-98`                   | Add `UpTo` variant (discriminator `4`) per layout above                                                                                                  |
| `state/payment_policy.rs:108-147`                 | Add `PolicyType::UpTo {..}` arm to `validate()`                                                                                                          |
| `policies/mod.rs`                                 | `pub mod up_to;` + re-export                                                                                                                             |
| `policies/up_to.rs`                               | **NEW** — `validate_up_to_policy(max_amount, valid_after, deadline)` + unit tests                                                                        |
| `shared/schedule.rs`                              | `UpTo` arm in `validate_policy_execution` (caller-supplied amount, time window, max check) + `UpTo` arm in `advance_policy` (always `true`) + unit tests |
| `error.rs`                                        | `PolicyExpired` variant — **SHARED with OneTime epic (tributary-w1h2)**; whichever ships first adds it                                                   |
| `instructions/payment/execute_payment.rs:176-180` | Extend recipient-triggerable set to include `UpTo`                                                                                                       |
| `state/composable_policy.rs`                      | No edit — inherits via shared PolicyType (verify create_composable accepts it; add test)                                                                 |

### SDK (`packages/sdk/src/sdk.ts`)

- `getCreateUpToPolicyInstruction(tokenMint, recipient, gateway, maxAmount, validAfter, deadline, memo, feePayer?)`
- `createUpToAuthorization(...)` — convenience wrapper (ATA + UserPayment + delegate approval + policy)
- `settleUpTo(policyPda, actualAmount)` — wraps `executePayment` with the caller-supplied amount; the x402 facilitator calls this at settle time.

### x402 package (`packages/sdk-x402/`)

| File                      | Change                                                                                                                                                                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/middleware.ts`       | Add `"x402://upto"` to `X402Scheme`; add `maxAmount`, `validAfter`, `deadline` to `X402Options` + `X402PaymentRequirements`; add `verifyUpToAuthorization()`; wire verify + settle branches in `createX402Middleware`; add UpTo params to `buildPaymentRequiredHeader` |
| `src/upto.ts`             | **NEW** — `settleUpTo(sdk, policyPda, actualAmount)` + `verifyUpToAuthorization(sdk, user, expected...)` helpers (keeps middleware.ts lean)                                                                                                                            |
| `src/metering.ts`         | Add `settleFromUsage(tracker, requestId, maxAmount)` helper — computes `min(cost, max)` and calls `settleUpTo`                                                                                                                                                         |
| `src/index.ts`            | Export new upto APIs                                                                                                                                                                                                                                                   |
| `test/upto.test.ts`       | **NEW** — unit tests for verify + settle + phase-dependent amount                                                                                                                                                                                                      |
| `test/middleware.test.ts` | Add upto scheme cases                                                                                                                                                                                                                                                  |
| `README.md`               | Add `x402://upto` to supported schemes + usage example                                                                                                                                                                                                                 |

### Tests

- `tests/up-to-policy.test.ts` — **NEW** on-chain integration: create → settle(actual < max) → Completed; settle(max) ok; settle(actual > max) fails; settle(0) ok; settle before valid_after fails; settle after deadline fails (`PolicyExpired`); re-settle fails; recipient-triggerable; composable UpTo + Lighthouse guard.
- `programs/tributary/src/shared/schedule.rs` unit tests (inline).
- `packages/sdk-x402/test/upto.test.ts` — facilitator verify/settle flow.

### Docs

- **NEW ADR-0020** — `apps/docs/adr/0020-upto-scheme-and-policy-variant.md`: names the variant, the x402 `upto` → Tributary `UpTo` mapping, why a new variant vs reusing PayAsYouGo/OneTime, the mandatory-decision (vs OneTime's optional expiry), and the recipient-triggerable decision.
- Update `AGENTS.md` ADR map + PolicyType bullet list + x402 scheme list.
- Update `packages/sdk-x402/README.md` scheme table.

## Relationship to the OneTime epic (tributary-w1h2)

- **Shared dependency:** both need the `PolicyExpired` error variant. Whichever
  ships first adds it; the other inherits. Coordinate to avoid duplicate
  definitions.
- **Overlapping files:** `state/payment_policy.rs`, `shared/schedule.rs`,
  `policies/mod.rs` are touched by both. Expect merge conflicts if developed
  in parallel on long-lived branches — recommend landing one before the other,
  or coordinating in a single combined PR.
- **Independent value:** each is useful alone. No hard `blocked-by`.

## Rejected alternatives (for ADR-0020)

1. **Reuse `PayAsYouGo` with `max_chunk = max_per_period = max` and a single
   period** — multi-settlement by design; "single-use" would need off-chain
   facilitator tracking. Violates the spec's on-chain single-use mandate.
2. **Reuse `OneTime` with a caller-supplied amount** — muddies OneTime's
   fixed-amount contract; the two amount models (fixed vs caller-determined)
   are fundamentally different execute paths. Two clean variants > one
   overloaded variant.
3. **Off-chain-only via `transfer` + signature replay cache** — no on-chain
   replay protection; the spec explicitly requires it. Rejected.
4. **Signature-based authorization (true Permit2 analog)** — would need a new
   program that verifies off-chain signatures and transfers on-demand. Far
   heavier than the PDA-policy model Tributary already has, for no benefit.
   The PDA-delegate model IS Tributary's replay protection.

## Open questions (resolve before/during impl)

1. **Zero-amount settlement**: when `actual == 0`, should `execute_payment`
   still flip status to `Completed` (consuming the authorization) or no-op?
   Spec allows `amount: 0`. Proposal: still settle + Complete (the auth is
   consumed; "no usage" is a valid single outcome). The execute path already
   guards `if recipient_amount > 0` before the CPI, so a 0 settle is a cheap
   status transition. Confirm.
2. **Deadline upper bound**: should creation reject `deadline` values more
   than N days in the future (e.g. 90) to prevent rent squatting on unused
   authorizations? Or leave it to the gateway/UX? Proposal: no program-level
   cap; gateways enforce their own policy window. Confirm.
3. **Facilitator trust model**: in the x402 flow, who signs the settle tx —
   the gateway signer (trusted facilitator) or the resource server (recipient)?
   Spec allows recipient binding. Proposal: either can settle (both are in the
   authorized set), matching PayAsYouGo. Confirm.
4. **JWT scope for upto**: the verify-phase JWT should be short-lived (valid
   only within `[valid_after, deadline]`), not the current `expiresIn: "1y"`
   used for subscriptions. Proposal: JWT `exp` = min(server policy, deadline).
   Confirm.

## Child work breakdown (can be split into child beans later)

- [ ] 1. Rust: `UpTo` variant + `validate()` arm + `policies/up_to.rs` + unit tests (RED->GREEN)
- [ ] 2. Rust: `UpTo` arms in `validate_policy_execution` (caller amount, time window, max) + `advance_policy` + `PolicyExpired` error (coordinate w/ OneTime epic) + unit tests
- [ ] 3. Rust: extend recipient-triggerable set in `execute_payment.rs` to include `UpTo`
- [ ] 4. Rust: integration test `tests/up-to-policy.test.ts` (settle<max, settle=max, settle>max fails, settle=0, time window, re-settle fails, recipient trigger, composable)
- [ ] 5. SDK: `getCreateUpToPolicyInstruction` + `createUpToAuthorization` + `settleUpTo` helpers
- [ ] 6. x402: `"x402://upto"` scheme + `src/upto.ts` (verify + settle) + middleware wiring + `buildPaymentRequiredHeader` params
- [ ] 7. x402: metering integration (`settleFromUsage`) + phase-dependent amount handling + short-lived JWT (exp=deadline)
- [ ] 8. x402: tests (`test/upto.test.ts`, extend `test/middleware.test.ts`) + README scheme table
- [ ] 9. Docs: ADR-0020 + AGENTS.md updates (ADR map, PolicyType bullets, x402 schemes)
- [ ] 10. `pnpm run lint` + `anchor test` + `cd tests && npx jest` + `cd packages/sdk-x402 && pnpm run test` all green
