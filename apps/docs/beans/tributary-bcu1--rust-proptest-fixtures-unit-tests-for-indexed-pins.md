---
# tributary-bcu1
title: Rust proptest fixtures + unit tests for indexed pins
status: completed
type: task
priority: high
created_at: 2026-07-10T10:18:33Z
updated_at: 2026-07-10T14:17:38Z
parent: tributary-je1p
---

## Files
- `programs/tributary/tests/proptest_pure_fns.rs`
- Any other Rust test files that construct InstructionConstraint fixtures

## Changes
- [x] Update all proptest InstructionConstraint fixtures to use `[PinnedAccount; 4]` instead of `[Pubkey; 4]`
- [x] Add proptest: duplicate-index detection (generate random pin sets, verify create rejects duplicates)
- [x] Add proptest: indexed pin check matches correct position in remaining_accounts
- [x] `cargo test` passes (173 unit + 23 proptest, 0 failures)

## Summary of Changes

### Prerequisite struct (from tributary-ddwd scope — needed for compilation)
- **composable_policy.rs**: Added `PinnedAccount { index: u8, pubkey: Pubkey }` struct, changed `InstructionConstraint.pinned_accounts` to `[PinnedAccount; 4]`, updated SIZE 202→206, simplified `has_effective_pins()` to `num_pinned_accounts > 0`, updated Default + all unit tests
- **error.rs**: Added `DuplicatePinIndex` error variant
- **create_composable_policy.rs**: Added duplicate-index check in `validate_forward_config()`, updated test fixtures
- **execute_composable.rs**: Updated Phase 3 pin-check loop for indexed model (`remaining[fwd_base + pin.index] == pin.pubkey`)

### This bean's deliverable (proptests)
- **proptest_pure_fns.rs**: Updated all 3 InstructionConstraint fixtures to use `[PinnedAccount; 4]`
- **proptest_pure_fns.rs**: Added `prop_duplicate_index_rejected` — generates random pin sets, verifies validate_forward_config rejects duplicate indices and accepts distinct ones
- **proptest_pure_fns.rs**: Added `prop_pins_match_correct_position` — generates random indexed pins, verifies pins_match() returns true for correct positions and false for corrupted ones

### Pure helpers added (for proptestability)
- `InstructionConstraint::has_duplicate_indices()` — O(n²) pairwise scan
- `InstructionConstraint::pins_match(remaining_keys, forward_start)` — pure check used by both execute and proptests

All tests pass: 173 unit + 23 proptest. Stress-tested at 10k cases with no flakes.
