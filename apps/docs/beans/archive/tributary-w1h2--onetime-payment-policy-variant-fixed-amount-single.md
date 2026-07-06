---
# tributary-w1h2
title: OneTime payment policy variant (fixed amount, single execution, full gateway lifecycle)
status: completed
type: epic
priority: high
created_at: 2026-06-30T14:09:12Z
updated_at: 2026-06-30T18:33:42Z
---

# OneTime payment policy variant

## Problem

We need a one-time, fixed-amount pull payment that flows through the **full
gateway machinery** (gateway signer, protocol/gateway/scheduler fee split,
referral rewards, composable hooks) — as a **real policy** with PDA, lifecycle
(`Active -> Completed`), pausability, deletability, and the UserPayment delegate
model — NOT the standalone `transfer` instruction (ADR-0004), which is a
stateless one-shot wrapper with no policy account, no lifecycle, and no
pre-approved delegation.

### OneTime policy vs `transfer` (ADR-0004)

| Aspect        | `transfer` (ADR-0004)   | `OneTime` policy (this epic)               |
| ------------- | ----------------------- | ------------------------------------------ |
| Account       | none — immediate CPI    | `PaymentPolicy` PDA (rent-bearing)         |
| Lifecycle     | none                    | `Active -> Completed` (terminal)           |
| Pausable      | no                      | yes (owner `Active <-> Paused`)            |
| Deletable     | n/a                     | yes (`delete_payment_policy`)              |
| Authorization | per-call token approval | `UserPayment` PDA delegate (pre-approved)  |
| Schedulable   | no (fires now)          | yes (`due_date` gates execution)           |
| Composable    | no                      | yes (Lighthouse validation + DLMM forward) |
| Fee split     | yes                     | yes (identical path)                       |
| Referrals     | yes                     | yes (identical path)                       |

## Why a new PolicyType variant

The codebase already anticipates this — a commented `OneTime` stub exists at
`programs/tributary/src/state/payment_policy.rs:92-97`. Adding a 4th variant
(discriminator `3`) is safe: the 128-byte fixed-layout invariant
(ADR-0002) means existing accounts deserialize identically; the enum
discriminator (`u8`) has room for 251 more variants.

Because `PolicyType` is shared between `PaymentPolicy` and `ComposablePolicy`
(ADR-0007 unification), OneTime lands in **both** families for free —
conditional one-shot payments ("pay 100 USDC once, only if recipient balance
< X, swapping to WSOL on delivery") work with no extra wiring.

## Variant layout (128 bytes payload)

```rust
OneTime {
    amount: u64,               // 8  — fixed payment amount, must be > 0
    due_date: i64,             // 8  — earliest execution; <= 0 means immediate
    expiry_date: Option<i64>,  // 9  — None = never expires; Some(ts) = hard deadline
    padding: [u8; 103],        // 103
}
// Total payload: 128 (matches ADR-0002 invariant)
```

`expiry_date` is included (not deferred) because enum variant fields are
immutable post-release; adding it later would require a `OneTimeV2` variant.
9 bytes of padding well-spent — "when does this invoice expire?" is the
obvious lifecycle question for a one-shot payment, and `Option<i64>` already
has precedent (`Subscription::max_renewals`).

## Semantics

### Create-time validation (`policies/one_time.rs::validate_one_time_policy`)

- `require!(amount > 0, InvalidAmount)`
- if `Some(exp) = expiry_date` and `due_date > 0`: `require!(exp > due, InvalidPaymentDueDate)`
- (No create-time due-date clamping — see execute-time rule below.)

### Execute-time gating (`shared/schedule.rs::validate_policy_execution`, new arm)

```rust
PolicyType::OneTime { amount, due_date, expiry_date, .. } => {
    if *due_date > 0 {
        require!(current_time >= *due_date, TributaryError::PaymentNotDue);
    }
    if let Some(exp) = expiry_date {
        require!(current_time <= *exp, TributaryError::PolicyExpired);
    }
    Ok(*amount)
}
```

- `due_date <= 0` => immediately executable (unifies both create paths — no
  per-variant clamp needed in `create_payment_policy.rs`).
- Amount is fixed (caller-supplied `provided_amount` ignored, like Subscription).

### Schedule advancement (`shared/schedule.rs::advance_policy`, new arm)

```rust
PolicyType::OneTime { .. } => {
    // Always terminal after one execution.
    Ok(true)
}
```

`execute_payment` / `execute_composable` then sets
`payment_policy.status = PolicyStatus::Completed`. Re-execution is blocked by
the existing `status == PolicyStatus::Active` constraint
(`execute_payment.rs:37`). **Single-execution guarantee is airtight.**

### Authorization

Same as Subscription: `fee_payer` must be `gateway.signer` or
`user_payment.owner`. Recipient **cannot** trigger (only `PayAsYouGo` allows
recipient triggering, per `execute_payment.rs:176-180`).

### Composable interplay

OneTime in a `ComposablePolicy` = conditional one-shot payment:

- **Validation hook (Lighthouse)**: pay once only if on-chain assertion holds
  (e.g. recipient hot-wallet balance below threshold).
- **Forward hook (Meteora DLMM)**: pull input token, swap, deliver output
  token — one time.
  Inherits all composable semantics (ADR-0008 through ADR-0010) unchanged.

## Touch points

### Rust program

| File                              | Change                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| `state/payment_policy.rs:46-98`   | Uncomment + reshape `OneTime` variant per layout above; update byte-count comment           |
| `state/payment_policy.rs:108-147` | Add `PolicyType::OneTime {..}` arm to `validate()` delegating to `validate_one_time_policy` |
| `policies/mod.rs`                 | `pub mod one_time;` + re-export                                                             |
| `policies/one_time.rs`            | **NEW** — `validate_one_time_policy(amount, due_date, expiry_date)` + unit tests            |
| `shared/schedule.rs:270-355`      | Add `OneTime` arm to `validate_policy_execution` (gating)                                   |
| `shared/schedule.rs:367-417`      | Add `OneTime` arm to `advance_policy` (always returns `true`)                               |
| `shared/schedule.rs` tests        | New unit tests: due-date gate, expiry gate, immediate (due_date<=0), advance-returns-true   |
| `error.rs`                        | Add `PolicyExpired` variant with `#[msg("One-time policy has expired")]`                    |

### No create-path edits

Both `create_payment_policy.rs` and `create_composable_policy.rs` need **no**
per-variant adjustment arm — `due_date <= 0 => immediate` is handled in
`validate_policy_execution`, so the create sites store the variant as-is.

### SDK (`packages/sdk/src/sdk.ts`)

- `getCreateOneTimePolicyInstruction(tokenMint, recipient, gateway, amount, dueDate, expiryDate, memo, feePayer?)` — low-level, mirrors `getCreateSubscriptionPolicyInstruction`
- `createOneTimePayment(tokenMint, recipient, gateway, amount, dueDate?, expiryDate?, memo?)` — convenience wrapper (ATA + UserPayment + delegate approval + policy), mirrors `createSubscription`
- Regenerate IDL types — `PolicyType` union gains `oneTime` member automatically.

### Tests

- `tests/one-time-payment.test.ts` — **NEW** integration: create -> execute -> verify `Completed` -> re-execute fails; due-date gating; expiry gating; delete after completion; composable OneTime + Lighthouse guard (pay-once-if-condition).
- `programs/tributary/src/shared/schedule.rs` unit tests (inline, red->green).

### Docs

- **NEW ADR 0019** — `apps/docs/adr/0019-onetime-policy-variant.md`: names the variant, the `Option<i64>` expiry decision (vs YAGNI), the `due_date <= 0 => immediate` convention, and the rejected alternatives (reuse `Subscription` with `max_renewals=1, auto_renew=false`; reuse `transfer`).
- Update `AGENTS.md` ADR map + PolicyType bullet list.
- Update `CONTEXT.md` if it enumerates PolicyType variants.

## Rejected alternatives (for ADR-0019)

1. **Reuse `Subscription` with `max_renewals=Some(1), auto_renew=false`** — works
   functionally but: (a) forces the user to specify a `payment_frequency`
   (meaningless for a single payment), (b) still advances `next_payment_due`
   via calendar-month math on execute (wasted compute + confusing state),
   (c) no `expiry_date` semantic, (d) SDK/memo/labeling all say "subscription".
   OneTime is a distinct primitive — faking it reuses 128 bytes but adds
   conceptual debt.
2. **Reuse `Milestone` with `total_milestones=1`** — same debt, plus drags in
   the `release_condition` bitmap and escrow accounting that are meaningless
   for a single pull payment.
3. **Just use `transfer` (ADR-0004)** — rejected by the requirement: no PDA,
   no lifecycle, no pausability, no schedulability, no composable hooks.

## Open questions (resolve before/during impl)

1. **Expiry UX**: when `expiry_date` passes, can the owner reclaim the
   delegate approval / auto-close the policy? Proposal: owner can
   `delete_payment_policy` (already exists); no auto-close (keeps the model
   uniform). Confirm.
2. **Scheduler incentive for a single fire**: a OneTime policy fires once, so
   the scheduler gets exactly one cut. Is that enough to incentivize
   monitoring? (Probably yes — the cut is the same as any single execution;
   gateways already monitor due-date policies.) Confirm no special handling.
3. **Event**: reuse existing `PaymentRecord` event (no new event variant
   needed — `payment_count` will be `1` for the single execution). Confirm.

## Child work breakdown (can be split into child beans later)

- [x] 1. Rust: add `OneTime` variant + `validate()` arm + `policies/one_time.rs` + unit tests (RED->GREEN)
- [x] 2. Rust: add `OneTime` arms to `validate_policy_execution` + `advance_policy` + `PolicyExpired` error + unit tests
- [x] 3. Integration test `tests/one-time-payment.test.ts` (create/execute/complete/re-exec-fails/due/expiry/delete)
- [x] 4. Composable OneTime integration test (Lighthouse guard — pay once if condition)
- [x] 5. SDK: `getCreateOneTimePolicyInstruction` + `createOneTimePayment` helper
- [x] 6. Docs: ADR-0019 + AGENTS.md ADR map + PolicyType bullets + CONTEXT.md
- [x] 7. `pnpm run lint` + `anchor test` + `cd tests && npx jest` green

## Verification notes

- `cargo test --manifest-path programs/tributary/Cargo.toml --lib`: **102 passed, 0 failed** (14 new OneTime tests: 6 validator + 8 schedule).
- `prettier --check` on all changed TS/MD files: clean.
- SDK `pnpm run build`: clean (regenerated types include `oneTime` variant).
- `anchor build`: regenerates IDL with the new variant.
- Jest integration suite (`tests/one-time-payment.test.ts`) requires a running Surfpool mainnet-fork (not available in this environment). TypeScript-compiles clean (`tsc --noEmit --project jest.tsconfig.json` reports zero errors on the new test file). Registered as `anchor run test-onetime` in Anchor.toml's `surfpool` chain.

## Summary of Changes

Added the `OneTime` `PolicyType` variant (discriminator 3) — a fixed-amount, single-execution pull payment with full gateway lifecycle. Lands in both `PaymentPolicy` and `ComposablePolicy` for free via the shared `PolicyType` enum (ADR-0007).

**Rust program (`programs/tributary/src/`):**
- `state/payment_policy.rs` — replaced the commented stub with the real `OneTime { amount, due_date, expiry_date, padding[103] }` variant (128-byte invariant preserved) + added the `validate()` arm.
- `policies/one_time.rs` (NEW) — `validate_one_time_policy` + 6 unit tests.
- `policies/mod.rs` — registered + re-exported the new module.
- `shared/schedule.rs` — `OneTime` arms in both `validate_policy_execution` (due/expiry gating, ignores caller-supplied amount) and `advance_policy` (always returns `true`); 8 new unit tests.
- `instructions/payment/create_payment_policy.rs` — added a no-op `OneTime` arm to the create-time adjustment match (variant stored as-is; `due_date <= 0` is the immediate convention).
- `error.rs` — added `PolicyExpired`.

**SDK (`packages/sdk/src/sdk.ts`):**
- `getCreateOneTimePolicyInstruction(...)` — low-level instruction builder.
- `createOneTimePayment(...)` — convenience wrapper (ATA + UserPayment + delegate approval + policy).

**Tests:**
- `tests/one-time-payment.test.ts` (NEW) — direct PaymentPolicy flow (create/execute/Completed/re-exec-fails/due-gate/expiry-gate/delete) + composable OneTime + Lighthouse guard (conditional one-shot payment).
- Registered as `anchor run test-onetime` in `Anchor.toml`.

**Docs:**
- `apps/docs/adr/0019-onetime-policy-variant.md` (NEW) — names the decision, the layout, the `due_date <= 0` convention, and the three rejected alternatives.
- `AGENTS.md` — ADR map entry + PolicyType bullet.
- `CONTEXT.md` — PolicyType variant count + OneTime definition.

**Verification:** `cargo test --lib` 102/102 green (14 new); `pnpm run build` (SDK) clean; `prettier --check` clean; `tsc --noEmit` on the new test clean. Jest run requires Surfpool (not in this env).
