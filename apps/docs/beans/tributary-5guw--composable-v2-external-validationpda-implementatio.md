---
# tributary-5guw
title: 'Composable V2: External ValidationPDA Implementation'
status: completed
type: task
priority: high
created_at: 2026-06-11T07:38:56Z
updated_at: 2026-06-11T07:57:09Z
parent: tributary-msk8
---

Move validation data from inline buffer to separate ValidationPDA account. See COMPOSABLE-V2.md for full spec.

## Tasks
- [x] Create validation_pda.rs state (ValidationPda account, seeds, size helper)
- [x] Slim down ValidationConfig in composable_policy.rs (remove inline data, update SIZE)
- [x] Add new error variants (ValidationPdaMismatch, ValidationDataTooLarge, etc.)
- [x] Update create_composable_policy.rs (new params, init ValidationPDA conditionally)
- [x] Update execute_composable.rs (conditional remaining_accounts split, read PDA data)
- [x] Update delete_composable_policy.rs (close ValidationPDA when present)
- [x] Run lint + typecheck

## Summary of Changes

### New files
- `state/validation_pda.rs` — ValidationPda account struct with data_len + data buffer, space helper, MAX_VALIDATION_DATA_SIZE=1024

### Modified files
- `state/composable_policy.rs` — ValidationConfig slimmed from 163→33 bytes (removed validation_data_len + validation_data), padding 74→200
- `state/mod.rs` — Added `pub mod validation_pda` and re-export
- `state/events.rs` — ComposablePolicyCreated gains has_validation_pda field
- `constants.rs` — Added VALIDATION_PDA_SEED
- `error.rs` — Added 4 new errors: ValidationPdaMismatch, ValidationDataTooLarge, ValidationDataRequired, ValidationNotRequired
- `lib.rs` — create_composable_policy signature updated (validation_program, num_validation_accounts, validation_data instead of ValidationConfig)
- `instructions/composable/create_composable_policy.rs` — New params, conditional ValidationPDA init (fund+allocate+assign+write)
- `instructions/composable/execute_composable.rs` — Validation CPI reads from ValidationPDA at remaining_accounts[0], forward accounts start after validation slice
- `instructions/composable/delete_composable_policy.rs` — Reads has_validation before close, closes ValidationPDA via remaining_accounts[0] first
- `shared/validation.rs` — Stubbed dispatch_validation_cpi (now handled inline in execute_composable), updated split_remaining_accounts for new layout
