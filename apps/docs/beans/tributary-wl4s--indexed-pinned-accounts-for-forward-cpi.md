---
# tributary-wl4s
title: Indexed Pinned Accounts for Forward CPI
status: completed
type: milestone
priority: high
created_at: 2026-07-10T10:16:58Z
updated_at: 2026-07-12T18:29:25Z
---

Refactor InstructionConstraint.pinned_accounts from positional [Pubkey; 4] to indexed [PinnedAccount; 4] where each pin specifies {index: u8, pubkey: Pubkey}. Security-driven: forward programs dictate fixed account grammars that Tributary cannot reshape, so positional pins (contiguous prefix only) leave critical accounts at non-contiguous positions unpinned — an account-substitution drain vector.

## Design decisions (grilling 2026-07-10)

### PinnedAccount struct
```rust
struct PinnedAccount {
    index: u8,      // position within the forward-account slice
    pubkey: Pubkey, // must match remaining_mid[fwd_base + index]
}
```

### InstructionConstraint change
```rust
// BEFORE (positional):
pinned_accounts: [Pubkey; 4],     // slot i → remaining_mid[fwd_base + i]

// AFTER (indexed):
pinned_accounts: [PinnedAccount; 4],  // pin.index → remaining_mid[fwd_base + pin.index]
```
Size: 202 → 206 bytes (+4: four index bytes).

### Create-time validation
- num_pinned_accounts <= 4 (unchanged)
- No duplicate indices among active pins (NEW)
- All active pins must have pubkey != Pubkey::default() (NEW — no default-pubkey wildcards in active set)
- Degenerate-pin guard unchanged: forward enabled requires num_pinned > 0 OR post_validation is ProgramCall

### Execute check (Phase 3)
```rust
for i in 0..n_pins {
    let pin = &instruction_constraint.pinned_accounts[i];
    require!(fwd_base + pin.index as usize < remaining_mid.len(), MissingForwardAccounts);
    require!(remaining_mid[fwd_base + pin.index as usize].key() == pin.pubkey, ByteRangeCheckFailed);
}
```

### has_effective_pins() simplifies
```rust
// BEFORE: checks for non-default pubkey in active prefix
// AFTER:
pub fn has_effective_pins(&self) -> bool {
    self.num_pinned_accounts > 0
}
```

### Unchanged
- ValidationPda.pinned_accounts stays positional [Pubkey; 2] (owner controls Lighthouse assertion ordering — no gap)
- MAX_PINNED_FORWARD_ACCOUNTS = 4
- Cold-relayer OR-gate: post_validation.is_program_call() || has_effective_pins()
- run_forward_cpi unchanged (same account slice, no change)

### ADR strategy
Amend ADR-0021 in place (pre-launch, same component, better representation).

### Not in scope
- ValidationPda pins (stays positional)
- Drift/Velocity allowlist expansion (deferred)
- Index range capping at create (execute-time bounds check only)
