---
# tributary-qpi6
title: Update tributary.qedspec for indexed PinnedAccount + recreate proofs
status: todo
type: feature
priority: normal
created_at: 2026-07-10T10:22:32Z
updated_at: 2026-07-10T20:09:53Z
parent: tributary-va39
---

## Prerequisite
Program contract must be done (`tributary-je1p`). The qedspec reflects the on-chain types — it cannot be updated until the Rust struct is finalized.

## Files
- `tributary.qedspec`
- `formal_verification/Spec.lean`
- `formal_verification/Proofs.lean`
- `formal_verification/kani.rs`
- `formal_verification/README.md`

## Current state
The qedspec and formal_verification currently have NO references to `pinned_accounts` or `InstructionConstraint` (confirmed via grep). The formal verification covers core payment-flow properties, not forward-CPI internals.

## Changes

### `tributary.qedspec`
- [ ] Add `PinnedAccount` struct definition to the type section
- [ ] Update `InstructionConstraint` type: `pinned_accounts: [PinnedAccount; 4]`
- [ ] Add invariant: `no_duplicate_indices(constraint)` — for all i != j in active set, `pinned_accounts[i].index != pinned_accounts[j].index`
- [ ] Add invariant: `all_pins_concrete(constraint)` — for all i in active set, `pinned_accounts[i].pubkey != Pubkey::default()`
- [ ] Add ensures clause for execute_composable Phase 3: for each active pin, if `fwd_base + pin.index < remaining_mid.len()`, then `remaining_mid[fwd_base + pin.index].key() == pin.pubkey`

### `formal_verification/` — recreate per qedgen workflow
- [ ] Run `qedgen --kani-impl` to regenerate Kani proof stubs from the updated spec
- [ ] Run `qedgen --lean` to regenerate Lean proof stubs
- [ ] Fill in proof obligations (or mark as `sorry` if undecidable in the given backend)
- [ ] `cd formal_verification && cargo kani` — Kani proofs compile and pass
- [ ] Lean proofs compile: `cd formal_verification && lake build`

## Note
If the qedgen tooling cannot express indexed-pin properties cleanly, mark the proofs as `sorry` stubs and create a follow-up investigation bean. The spec update is the deliverable; full proof discharge is best-effort.
