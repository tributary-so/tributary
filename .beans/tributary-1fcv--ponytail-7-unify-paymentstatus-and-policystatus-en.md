---
# tributary-1fcv
title: 'Ponytail #7: unify PaymentStatus and PolicyStatus enums'
status: draft
type: task
priority: normal
tags:
    - ponytail
    - dedup
created_at: 2026-06-24T12:38:55Z
updated_at: 2026-06-25T08:05:49Z
parent: tributary-9hca
---

Two near-identical status enums exist:

- `state/payment_policy.rs:166-172` — `PaymentStatus { Active, Paused }`
- `state/policy_status.rs:3-14` — `PolicyStatus { Active, Paused, Completed }`

`PaymentStatus` is used only by `PaymentPolicy`. `PolicyStatus` is used by `ComposablePolicy`. The only delta is `Completed`, which PaymentPolicy never reaches today (it uses `Paused` as terminal state, set inside `MilestoneStrategy::update_policy_state`).

Consequence: `change_payment_policy_status::handler` and `change_composable_status::handler` each carry their own `Active↔Paused` transition match. Identical logic.

## Cut

- [ ] Delete `PaymentStatus` enum + its derives
- [ ] Rename all `PaymentStatus` references to `PolicyStatus` across:
  - `state/payment_policy.rs` (`PaymentPolicy.status` field, size comment)
  - `instructions/payment/{create,change_status,delete,execute}_payment_policy.rs`
  - `instructions/payment/execute_payment.rs:37` (`constraint = payment_policy.status == PaymentStatus::Active`)
  - `policies/milestone.rs:140` (`PaymentStatus::Paused`)
  - `state/events.rs` (`PaymentPolicyStatusChanged.old/new_status`)
- [ ] After unification, `change_payment_policy_status::handler` can adopt the same 3-arm `Active↔Paused↔Completed` match as `change_composable_status` — OR keep the 2-arm version if `Completed` should stay terminal-for-payment-policies (semantic decision: can a payment policy be explicitly Completed by the owner? If yes, allow the transition; if no, reject `(_, Completed)` for PaymentPolicy).

## Verification

- Account layout unchanged — both enums serialize identically (1-byte discriminator, Anchor borsh). No migration.
- `cargo test --lib` + `anchor test` must pass.

## Risk

Low. Pure rename + one transition-rule decision.

## Decision needed

Should `PaymentPolicy` allow owner-initiated `Active → Completed`? If yes, the unified enum's full transition table applies. If no, the payment-policy status-change handler keeps its narrower `Active↔Paused` only match (and execution can still set `Completed` for exhausted subscriptions post-M7 — currently it sets `Paused`).

## Files
- `programs/tributary/src/state/payment_policy.rs:166-172` (delete enum)
- `programs/tributary/src/state/policy_status.rs` (keep, becomes the single enum)
- All `PaymentStatus` references repo-wide
