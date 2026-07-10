---
# tributary-qpi6
title: Update tributary.qedspec for indexed PinnedAccount + recreate proofs
status: todo
type: feature
priority: normal
created_at: 2026-07-10T10:22:32Z
updated_at: 2026-07-10T10:22:32Z
parent: tributary-va39
---

## Files
- `tributary.qedspec`
- `formal_verification/` (entire directory: Spec.lean, Proofs.lean, kani.rs, README.md, etc.)

## Changes
- [ ] Update tributary.qedspec: add PinnedAccount struct to the InstructionConstraint spec
- [ ] Update spec invariants: indexed pin check (for each active pin, remaining_mid[fwd_base + index] == pubkey)
- [ ] Add spec property: no duplicate indices among active pins (create-time invariant)
- [ ] Add spec property: all active pins have concrete pubkeys (no default in active set)
- [ ] Recreate the entire formal_verification directory per qedgen workflow
- [ ] Kani proofs compile: `cd formal_verification && cargo kani`
- [ ] Lean proofs compile (if applicable)
