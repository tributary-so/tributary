---
# tributary-yerq
title: 'Composable: Shared Utilities Extraction'
status: completed
type: task
priority: high
created_at: 2026-06-10T18:44:20Z
updated_at: 2026-06-10T19:07:12Z
parent: tributary-msk8
blocked_by:
    - tributary-y0pk
---

Phase 2 of composable implementation. Extract shared logic from execute_payment into reusable modules for both payment and composable paths.

- [ ] Create shared/mod.rs
- [ ] Create shared/fees.rs — extract calculate_fees() from execute_payment (protocol_fee_bps resolution, net/gross mode, gateway_fee + protocol_fee calculation)
- [ ] Create shared/strategies.rs — ScheduleType validation that mirrors existing PolicyType logic (Timed→Subscription, Milestone→Milestone, Usage→PayAsYouGo)
- [ ] Create shared/delegation.rs — extract delegate resolution logic (UserPayment PDA vs PaymentsDelegate seed selection)
- [ ] Create shared/validation.rs — validation CPI dispatch: split remaining_accounts, build CPI invoke_signed, handle Pubkey::default() skip
- [ ] Refactor execute_payment.rs to use shared/fees.rs (no behavior change)
- [ ] Verify: cargo check + existing anchor tests still pass

Files: shared/ (new dir), execute_payment.rs (refactored)

## Summary of Changes

Created shared/ module with 5 files: mod.rs, fees.rs (FeeBreakdown + calculate_fees), delegation.rs (DelegateResolution + resolve_delegate), strategies.rs (validate_schedule_execution + advance_schedule for ScheduleType), validation.rs (dispatch_validation_cpi + split_remaining_accounts). Added pub mod shared to lib.rs.
