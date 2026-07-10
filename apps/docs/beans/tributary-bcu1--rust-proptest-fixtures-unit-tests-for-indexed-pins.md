---
# tributary-bcu1
title: Rust proptest fixtures + unit tests for indexed pins
status: todo
type: task
priority: high
created_at: 2026-07-10T10:18:33Z
updated_at: 2026-07-10T10:18:33Z
parent: tributary-je1p
---

## Files
- `programs/tributary/tests/proptest_pure_fns.rs`
- Any other Rust test files that construct InstructionConstraint fixtures

## Changes
- [ ] Update all proptest InstructionConstraint fixtures to use `[PinnedAccount; 4]` instead of `[Pubkey; 4]`
- [ ] Add proptest: duplicate-index detection (generate random pin sets, verify create rejects duplicates)
- [ ] Add proptest: indexed pin check matches correct position in remaining_accounts
- [ ] `cargo test` passes
