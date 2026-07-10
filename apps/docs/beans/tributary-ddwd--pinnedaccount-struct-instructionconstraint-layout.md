---
# tributary-ddwd
title: PinnedAccount struct + InstructionConstraint layout + has_effective_pins + Default + SIZE
status: todo
type: task
priority: high
created_at: 2026-07-10T10:17:53Z
updated_at: 2026-07-10T10:17:53Z
parent: tributary-je1p
---

## Files
- `programs/tributary/src/state/composable_policy.rs`

## Changes
- [ ] Add `PinnedAccount { index: u8, pubkey: Pubkey }` struct (AnchorSerialize/Deserialize, Clone, Copy, Debug, PartialEq, Default)
- [ ] Change `InstructionConstraint.pinned_accounts` from `[Pubkey; MAX_PINNED_FORWARD_ACCOUNTS]` to `[PinnedAccount; MAX_PINNED_FORWARD_ACCOUNTS]`
- [ ] Update `InstructionConstraint::SIZE`: 202 → 206 (+4 bytes for index fields)
- [ ] Simplify `has_effective_pins()`: `self.num_pinned_accounts > 0` (no longer scans for non-default pubkeys)
- [ ] Update `InstructionConstraint::default()`: pinned_accounts = `[PinnedAccount::default(); 4]`
- [ ] Update all existing unit tests in composable_policy.rs that construct InstructionConstraint fixtures
- [ ] Add unit test: PinnedAccount Borsh round-trip
- [ ] Add unit test: has_effective_pins() with indexed pins (num=0 false, num>0 true)
- [ ] `cargo test` passes
