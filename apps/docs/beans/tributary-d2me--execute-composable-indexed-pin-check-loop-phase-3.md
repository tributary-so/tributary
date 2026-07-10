---
# tributary-d2me
title: 'execute_composable: indexed pin-check loop (Phase 3)'
status: completed
type: task
priority: high
created_at: 2026-07-10T10:18:24Z
updated_at: 2026-07-10T15:01:05Z
parent: tributary-je1p
---

## Files
- `programs/tributary/src/instructions/composable/execute_composable.rs` (lines ~1256-1272)

## Changes
- [x] Replace positional pin-check loop:
```rust
// BEFORE:
for i in 0..n_pins {
    let pin = instruction_constraint.pinned_accounts[i];
    if pin != Pubkey::default() {
        require!(fwd_base + i < remaining_mid.len(), MissingForwardAccounts);
        require!(remaining_mid[fwd_base + i].key() == pin, ByteRangeCheckFailed);
    }
}

// AFTER:
for i in 0..n_pins {
    let pin = &instruction_constraint.pinned_accounts[i];
    require!(fwd_base + pin.index as usize < remaining_mid.len(), MissingForwardAccounts);
    require!(remaining_mid[fwd_base + pin.index as usize].key() == pin.pubkey, ByteRangeCheckFailed);
}
```
- [x] Remove the inner `if pin != Pubkey::default()` skip (all active pins are concrete — decision B)
- [x] Verify `has_effective_pins()` call sites in execute still compile (simplified to num_pinned > 0)
- [x] `cargo test` passes


## Summary of Changes

All four changes landed in commit `a75d6bb8` (part of the atomic
On-chain InstructionConstraint + PinnedAccount refactor, parent
bean tributary-je1p):

- `execute_composable.rs` Phase 3 loop rewritten to indexed model:
  `pin = &pinned_accounts[i]`, bounds-check `fwd_base + pin.index`,
  key-check `remaining_mid[idx].key() == pin.pubkey`.
- Removed the `if pin != Pubkey::default()` wildcard skip — every
  declared pin is now a concrete constraint (decision B).
- `has_effective_pins()` simplified to `num_pinned_accounts > 0`;
  both call sites (execute_composable cold-relayer OR-gate,
  create_composable_policy degenerate-pin guard) compile clean.
- `cargo test`: 23 passed, 0 failed — includes the new indexed-pin
  proptests `prop_duplicate_index_rejected` and
  `prop_pins_match_correct_position`.
