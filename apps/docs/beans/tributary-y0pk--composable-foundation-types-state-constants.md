---
# tributary-y0pk
title: 'Composable: Foundation — Types, State, Constants'
status: completed
type: task
priority: high
created_at: 2026-06-10T18:44:20Z
updated_at: 2026-06-10T18:51:54Z
parent: tributary-msk8
---

Phase 1 of composable implementation. All state types and constants needed before instructions can be built.

- [x] Add `COMPOSABLE_POLICY_SEED` to constants.rs
- [x] Create `state/policy_header.rs` — PolicyHeader struct, PolicyStatus enum (Active/Paused/Completed)
- [x] Create `state/composable_policy.rs` — ComposablePolicy struct with full account layout (~760 bytes), ScheduleType enum (Timed/Milestone/Usage), ForwardConfig (target_program, input_mint, output_mint, min_output_amount, forward_flags, ByteRangeCheck array), ValidationConfig (validation_program, num_validation_accounts, validation_data), ExecutionState, ByteRangeCheck struct
- [x] Update `state/user_payment.rs` — consume 11 bytes from padding: active_composable_count (u32), created_composable_count (u32), delegate_version (u8). Padding 220→209
- [x] Add composable error variants to error.rs: InvalidForwardProgram, InvalidValidationProgram, ByteRangeCheckFailed, InsufficientOutputAmount, ComposableNotEnabled, InvalidDelegateVersion
- [x] Add whitelist constants: ALLOWED_FORWARD_PROGRAMS (Meteora DLMM, Jupiter V6), ALLOWED_VALIDATION_PROGRAMS (Lighthouse)
- [x] Update state/mod.rs to export new types
- [x] Verify: `cargo check` passes

Files: constants.rs, state/policy_header.rs (new), state/composable_policy.rs (new), state/user_payment.rs, error.rs, state/mod.rs
