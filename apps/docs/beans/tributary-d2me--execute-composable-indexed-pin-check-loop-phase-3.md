---
# tributary-d2me
title: 'execute_composable: indexed pin-check loop (Phase 3)'
status: todo
type: task
priority: high
created_at: 2026-07-10T10:18:24Z
updated_at: 2026-07-10T10:18:24Z
parent: tributary-je1p
---

## Files
- `programs/tributary/src/instructions/composable/execute_composable.rs` (lines ~1256-1272)

## Changes
- [ ] Replace positional pin-check loop:
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
- [ ] Remove the inner `if pin != Pubkey::default()` skip (all active pins are concrete — decision B)
- [ ] Verify `has_effective_pins()` call sites in execute still compile (simplified to num_pinned > 0)
- [ ] `cargo test` passes
