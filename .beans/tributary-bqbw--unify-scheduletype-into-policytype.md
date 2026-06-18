---
# tributary-bqbw
title: Unify ScheduleType into PolicyType
status: completed
type: task
priority: high
created_at: 2026-06-18T06:38:18Z
updated_at: 2026-06-18T06:56:38Z
---

Replace ScheduleType with PolicyType in ComposablePolicy. Both PaymentPolicy and ComposablePolicy share the same enum. Merge schedule.rs advancement into a unified advance_policy that both execute_payment and execute_composable call. ComposablePolicy is unreleased - zero migration risk. PaymentPolicy layout unchanged - zero risk to released payments.

## Motivation
ScheduleType and PolicyType are byte-identical duplicates:
- PolicyType::Subscription == ScheduleType::Timed (same fields, different names)
- PolicyType::PayAsYouGo == ScheduleType::Usage (literally identical)
- PolicyType::Milestone ⊃ ScheduleType::Milestone (has extra escrow_amount)

## Plan

### Phase 1 — Unify the enum
- [x] Delete ScheduleType from state/composable_policy.rs
- [x] Replace ComposablePolicy.schedule: ScheduleType with ComposablePolicy.policy_type: PolicyType
- [x] Update ComposablePolicy::SIZE calculation
- [x] Update all create_composable_policy.rs / change_composable_status.rs / delete_composable_policy.rs to construct PolicyType variants instead of ScheduleType variants
- Verify: cargo check

### Phase 2 — Unify advancement into advance_policy
- [x] Create advance_policy(policy_type: &mut PolicyType, current_time: i64, amount: u64) -> Result<bool> in shared/schedule.rs
- [x] advance_policy::Subscription calls calculate_next_payment_due + handles auto_renew/max_renewals completion
- [x] advance_policy::Milestone increments current_milestone
- [x] advance_policy::PayAsYouGo handles period reset + current_period_total update
- [x] Create validate_policy_execution(policy_type: &PolicyType, current_time: i64, provided_amount: Option<u64>) -> Result<u64>
- [x] Refactor execute_composable.rs to call advance_policy + validate_policy_execution
- [~] **DEFERRED**: subscription.rs::update_policy_state NOT refactored to call advance_policy. Reason: the subscription path tracks completion via `payment_count >= max_renewals` (non-destructive comparison in `should_pause_policy`), while `advance_policy` DECREMENTS `max_renewals`. Calling advance_policy from subscription would double-count and break completion semantics. Both paths share `calculate_next_payment_due` as the primitive — the orchestration correctly differs because the products differ.
- Verify: cargo check + cargo test --lib

### Phase 3 — Cleanup
- [x] Remove dead ComposableExecutionResult struct from schedule.rs
- [x] Update or remove ScheduleType-specific tests (rewritten as PolicyType::Subscription tests)
- [x] Verify IDL still has all instructions via anchor build (21/21; create_composable_policy now takes policy_type: PolicyType)
- Verify: cargo test --lib + anchor build

### Safety guarantees
- PaymentPolicy layout UNCHANGED (released, has user funds)
- PolicyType enum UNCHANGED (same variants, same field names, same sizes)
- Only ComposablePolicy changes (unreleased)
- cargo check + cargo test --lib gate every phase

## Summary of Changes

### ScheduleType eliminated — PolicyType is now the single enum

Deleted `ScheduleType` entirely. `ComposablePolicy` now embeds `policy_type: PolicyType` — the same enum `PaymentPolicy` has used since release. Both account types share one enum, one set of field names, one set of validation rules.

### Field name mapping (ScheduleType → PolicyType)
| ScheduleType field       | PolicyType field          |
|--------------------------|---------------------------|
| `Timed`                    | `Subscription`              |
| `next_execution_due`       | `next_payment_due`           |
| `max_executions`           | `max_renewals`               |
| `frequency`                | `payment_frequency`          |
| `Usage`                    | `PayAsYouGo`                 |
| `Milestone.current`        | `Milestone.current_milestone` |
| `Milestone.total`          | `Milestone.total_milestones`   |
| `Milestone.amounts`        | `Milestone.milestone_amounts`  |
| `Milestone.timestamps`     | `Milestone.milestone_timestamps` |

(`PayAsYouGo` and `Usage` were already byte-identical — same field names, types, order.)

### Unified advancement functions (shared/schedule.rs)
- `advance_policy(&mut PolicyType, i64, u64) -> Result<bool>` — single function for all three variants. Subscription uses calendar-month math via `calculate_next_payment_due`.
- `validate_policy_execution(&PolicyType, i64, Option<u64>) -> Result<u64>` — single validation entry point.
- `execute_composable.rs` calls both.
- `subscription.rs` left unchanged (its `PolicyStrategy` trait uses `payment_count >= max_renewals` for completion, which is incompatible with `advance_policy`'s decrement approach — see deferred todo).

### What changed
```
state/composable_policy.rs   — ScheduleType deleted; ComposablePolicy.policy_type: PolicyType
state/events.rs              — ComposablePolicyCreated.schedule → policy_type: PolicyType
lib.rs                       — create_composable_policy arg: schedule → policy_type
instructions/composable/
  create_composable_policy.rs — constructs PolicyType; calls policy_type.validate()
  execute_composable.rs       — calls advance_policy + validate_policy_execution
shared/schedule.rs           — rewritten: advance_policy + validate_policy_execution
```

### What did NOT change (backwards-compat guarantees)
- `PaymentPolicy` layout: UNCHANGED (released, has user funds)
- `PolicyType` enum: UNCHANGED (same variants, same fields, same sizes)
- `policies/subscription.rs`: UNCHANGED (separate completion tracking)
- All PDA seeds, account sizes, validation logic

### Verification
- `cargo check`: clean (3 pre-existing dead-code warnings)
- `cargo test --lib`: **42 passed, 0 failed** (8 M-04 guard tests in shared::schedule)
- `cargo clippy --lib`: 25 warnings, unchanged from baseline
- `anchor build`: IDL regenerated, 21 instructions, `create_composable_policy` now takes `PolicyType`

### Follow-up work (deferred)
- TS integration tests (`tests/composable.test.ts`) need updating to use `PolicyType` naming (`subscription` instead of `timed`, `maxRenewals` instead of `maxExecutions`, etc.)
- SDK source (`packages/sdk/src/types.ts`, `sdk.ts`) needs `ScheduleType` → `PolicyType` rename after IDL rebuild
