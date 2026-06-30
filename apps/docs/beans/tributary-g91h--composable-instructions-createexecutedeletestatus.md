---
# tributary-g91h
title: 'Composable: Instructions (create/execute/delete/status)'
status: completed
type: task
priority: high
created_at: 2026-06-10T18:44:20Z
updated_at: 2026-06-10T19:07:12Z
parent: tributary-msk8
blocked_by:
    - tributary-yerq
---

Phase 3 of composable implementation. The core instructions.

- [ ] Create instructions/composable/mod.rs
- [ ] create_composable_policy: validate ForwardConfig (whitelist check), ScheduleType, ValidationConfig (whitelist or default), ByteRangeCheck array (min 1 for discriminator). Increment UserPayment counters. Require gateway signer.
- [ ] execute_composable: 10-step flow per spec — (1) validate policy active + schedule condition + delegation + byte-range checks, (2) optional validation CPI, (3) calculate fees, (4) claim fees from user token, (5) claim input to intermediate ATA, (6) ensure output ATA, (7) forward CPI with remaining_accounts, (8) sweep output (check min_output_amount), (9) cleanup empty ATAs, (10) update ExecutionState + advance schedule
- [ ] delete_composable_policy: close ComposablePolicy, decrement UserPayment active count, return rent
- [ ] change_composable_status: Active↔Paused transitions, Completed terminal state
- [ ] Wire up in lib.rs
- [ ] Verify: cargo check passes

Files: instructions/composable/ (new dir), lib.rs, instructions/mod.rs

## Summary of Changes

Created instructions/composable/ with 4 handlers: create_composable_policy, execute_composable (10-step CPI flow), delete_composable_policy, change_composable_status. Added composable module to instructions/mod.rs. Added 4 program entrypoints to lib.rs. Added 4 events to state/events.rs (ComposablePolicyCreated, ComposableExecuted, ComposablePolicyStatusChanged, ComposablePolicyDeleted).
