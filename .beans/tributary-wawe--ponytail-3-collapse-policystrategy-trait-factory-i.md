---
# tributary-wawe
title: 'Ponytail #3: collapse PolicyStrategy trait + factory into direct match'
status: draft
type: task
priority: normal
tags:
    - ponytail
    - yagni
created_at: 2026-06-24T12:37:47Z
updated_at: 2026-06-25T08:05:45Z
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
