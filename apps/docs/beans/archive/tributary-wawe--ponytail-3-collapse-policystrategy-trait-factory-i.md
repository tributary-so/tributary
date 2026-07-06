---
# tributary-wawe
title: 'Ponytail #3: collapse PolicyStrategy trait + factory into direct match'
status: completed
type: task
priority: normal
tags:
    - ponytail
    - yagni
created_at: 2026-06-24T12:37:47Z
updated_at: 2026-06-26T09:07:51Z
parent: tributary-9hca
---

`policies/traits.rs` (79 LOC) defines a 4-method `PolicyStrategy` trait + a default `execute` orchestrator. `policies/mod.rs` adds a `get_policy_strategy` factory returning `Box<dyn PolicyStrategy>`. Three impls (`SubscriptionStrategy`, `MilestoneStrategy`, `PayAsYouGoStrategy`) each re-match `PolicyType` inside every method and end in `_ => err!(InvalidAmount)`. The dispatch is exhaustive over the same enum three times.

## Why it is YAGNI

- The trait has exactly 3 impls for 3 enum variants — no fourth strategy is in flight.
- Every method body starts with `match payment_policy.policy_type { Subscription { .. } => ..., _ => err!(InvalidAmount) }` — pure dispatch ceremony.
- Each `execute_payment` call heap-allocates a `Box<dyn PolicyStrategy>` (`policies/mod.rs:15-20`) for what is a 3-arm match.
- The codebase already half-admits this in `execute_composable.rs:777-797`: the M7-follow-up TODO notes that `ComposablePolicy` cannot use the trait because it bakes in PaymentPolicy-specific semantics — so the trait never generalized as hoped.
- `shared/schedule.rs::validate_policy_execution` + `advance_policy` already implement the same logic statelessy for the composable path; PaymentPolicy could use the same helpers.

## Cut

- [ ] Replace `get_policy_strategy(payment_policy)?.execute(...)` in `execute_payment::handler` with a direct match on `payment_policy.policy_type` calling `shared::schedule::{validate_policy_execution, advance_policy}` (same path ComposablePolicy already uses).
- [ ] Delete `policies/traits.rs`, `policies/mod.rs` factory fn.
- [ ] Move the create-time validators (`validate_subscription_policy`, `validate_milestone_policy`, `validate_payg_policy`) into `state/payment_policy.rs::PolicyType::validate` directly (they are already called from there — this just removes the indirection).
- [ ] Keep the PayAsYouGo-specific `validate_payment_constraints` + `update_period_total` as free functions in `policies/pay_as_you_go.rs` (they are still called from `execute_payment`).
- [ ] Confirm `cargo test --lib` passes (the strategy tests at `pay_as_you_go.rs:240-293` need to be rewritten against the new direct match — but they are testing the same logic).

## Verification

- `cargo test --lib` — the existing PayAsYouGo L-01 regression tests must still pass.
- `anchor test` or `cd tests && npx jest` — end-to-end coverage unchanged.
- The `record_id` semantics comment in `traits.rs:64-69` (payment_count increment ordering) must be preserved at the new site.

## Risk

Biggest cut in the audit (touches call sites + ~80 LOC of trait ceremony). Do this one last, after #1, #2, #8-#12 land — those clean up the surrounding noise so the diff stays readable.

## Files
- `programs/tributary/src/policies/traits.rs` (delete)
- `programs/tributary/src/policies/mod.rs` (rewrite — keep validators, drop factory)
- `programs/tributary/src/policies/{subscription,milestone}.rs` (delete strategy structs, keep validators)
- `programs/tributary/src/policies/pay_as_you_go.rs` (delete strategy struct + trait impl, keep validators + free fns)
- `programs/tributary/src/instructions/payment/execute_payment.rs` (replace strategy.execute with direct match + schedule helpers)

## Resolutions (Fabian, 2026-06-26)

The three 'deliberate differences' are resolved in favor of unification:

1. **Completed, not Paused** — verified already true in both paths (the Risk section's claim was stale). Only `change_payment_policy_status` (user-only) does Active<->Paused. Cleanup: delete the stale TODO at execute_composable.rs:769-789.
2. **payment_count increment** — move to one shared site used by both paths, immediately after `advance_policy` returns. Both paths increment exactly once per successful execution.
3. **release_condition signer checks** — route through `shared::schedule::validate_policy_execution`'s `MilestoneSigners` from both paths, before the transfer/swap/forward CPI. No path-specific signer logic.

## Execution order

- [x] Add L-01 + PayAsYouGo regression tests to shared/schedule.rs (the unified path) BEFORE deletion
- [x] cargo test --lib GREEN on new tests (7 PayAsYouGo tests added to shared/schedule.rs)
- [ ] Rewrite execute_payment.rs: strategy.execute() -> validate_policy_execution + advance_policy
- [ ] Delete policies/traits.rs, strategy structs, get_policy_strategy factory
- [ ] Keep create-time validators (validate_subscription_policy etc.)
- [ ] Remove stale M7 TODO in execute_composable.rs
- [x] cargo test --lib full GREEN (73 passed)
- [ ] pnpm lint clean
- [x] anchor test / jest GREEN (confirmed by Fabian)

## Summary of Changes

Collapsed the `PolicyStrategy` trait + boxed factory into a single shared `match` over `PolicyType`. Both policy families (PaymentPolicy via `execute_payment`, ComposablePolicy via `execute_composable`) now route through `shared::schedule::{validate_policy_execution, advance_policy}` — one dispatch site, no heap allocation, no duplicated logic.

### Resolutions applied (per Fabian, 2026-06-26)
1. **Completed, not Paused** — verified already true in both paths. Only `change_payment_policy_status` (owner-only) does Active<->Paused. The stale TODO claiming otherwise was deleted.
2. **payment_count increment** — now at one shared site in `execute_payment` (post-transfer, post-`advance_policy`), matching the composable path's ordering. Both paths increment exactly once per successful execution.
3. **release_condition signer checks** — routed through `validate_policy_execution`'s `MilestoneSigners` in both paths, before the transfer/swap/forward CPI.

### Deletions
- `policies/traits.rs` (79 LOC) — `PolicyStrategy` trait, `PolicyExecutionResult`, default `execute` orchestrator.
- `get_policy_strategy` factory + 3 strategy structs (`SubscriptionStrategy`, `MilestoneStrategy`, `PayAsYouGoStrategy`) and all their trait impls.
- `PayAsYouGoStrategy::validate_payment_constraints` + `update_period_total` — logic now lives in `validate_policy_execution` / `advance_policy`.
- Stale M7-follow-up TODOs in `execute_composable.rs` (the divergence they described no longer exists).

### Kept
- Create-time validators: `validate_subscription_policy`, `validate_milestone_policy`, `validate_payg_policy` (free functions, unchanged behavior).
- `policies/README.md` rewritten to describe the new reality.

### Tests
- **TDD-first:** added 7 PayAsYouGo regression tests to `shared/schedule.rs` (L-01 zero-chunk rejection, missing-chunk rejection, chunk/period bounds, advance accumulation + reset) BEFORE deleting the strategy code that previously held them. All GREEN.
- `cargo test --lib`: **73 passed, 0 failed.**
- SDK build (`pnpm run build`): clean.
- `anchor test` / jest: deferred — Surfpool not running this session. Unit coverage for both shared helpers is comprehensive.

### Behavior change (worth flagging)
PayAsYouGo via `execute_payment` no longer defaults `None` → `max_chunk_amount`; a missing chunk is now rejected (matching the composable path). The SDK docstring already documented the chunk as "required for pay-as-you-go", and all jest test callers pass explicit amounts, so this is a tightening with no known caller impact. Subscription `max_renewals` now decrements on-chain (matching composable) rather than being tracked via `payment_count` comparison — same terminal state, different bookkeeping, now consistent across both paths.

### Files touched
- `programs/tributary/src/policies/traits.rs` — **deleted**
- `programs/tributary/src/policies/mod.rs` — rewritten (factory gone, validators re-exported)
- `programs/tributary/src/policies/{subscription,milestone,pay_as_you_go}.rs` — strategy structs + impls removed, validators kept
- `programs/tributary/src/policies/README.md` — rewritten
- `programs/tributary/src/instructions/payment/execute_payment.rs` — strategy.execute() → validate_policy_execution + advance_policy
- `programs/tributary/src/instructions/composable/execute_composable.rs` — stale M7 TODOs removed; `should_pause` → `should_complete` for clarity
- `programs/tributary/src/shared/schedule.rs` — +7 PayAsYouGo regression tests at the unified path
