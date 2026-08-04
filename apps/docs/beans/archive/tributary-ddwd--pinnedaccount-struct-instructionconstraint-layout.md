---
# tributary-ddwd
title: PinnedAccount struct + InstructionConstraint layout + has_effective_pins + Default + SIZE
status: completed
type: task
priority: high
created_at: 2026-07-10T10:17:53Z
updated_at: 2026-07-10T15:06:14Z
parent: tributary-je1p
---

## Files
- `programs/tributary/src/state/composable_policy.rs`

## Changes
- [x] Add `PinnedAccount { index: u8, pubkey: Pubkey }` struct (AnchorSerialize/Deserialize, Clone, Copy, Debug, PartialEq, Default)
- [x] Change `InstructionConstraint.pinned_accounts` from `[Pubkey; MAX_PINNED_FORWARD_ACCOUNTS]` to `[PinnedAccount; MAX_PINNED_FORWARD_ACCOUNTS]`
- [x] Update `InstructionConstraint::SIZE`: 202 → 206 (+4 bytes for index fields)
- [x] Simplify `has_effective_pins()`: `self.num_pinned_accounts > 0` (no longer scans for non-default pubkeys)
- [x] Update `InstructionConstraint::default()`: pinned_accounts = `[PinnedAccount::default(); 4]`
- [x] Update all existing unit tests in composable_policy.rs that construct InstructionConstraint fixtures
- [x] Add unit test: PinnedAccount Borsh round-trip
- [x] Add unit test: has_effective_pins() with indexed pins (num=0 false, num>0 true)
- [x] `cargo test` passes

## Summary of Changes

All checklist items were already implemented in `programs/tributary/src/state/composable_policy.rs` (PinnedAccount struct, InstructionConstraint layout with indexed pins, SIZE=206, simplified has_effective_pins, Default, and all unit tests including Borsh round-trip and has_effective_pins coverage). `cargo test` — 23 tests pass. Fixed one stale downstream comment: ForwardConfig::SIZE comment corrected from 267 → 271 bytes (consequence of the InstructionConstraint SIZE bump from 202 → 206).
