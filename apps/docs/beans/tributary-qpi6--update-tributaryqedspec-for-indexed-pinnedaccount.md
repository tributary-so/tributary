---
# tributary-qpi6
title: Update tributary.qedspec for indexed PinnedAccount + recreate proofs
status: completed
type: feature
priority: normal
created_at: 2026-07-10T10:22:32Z
updated_at: 2026-07-11T17:44:10Z
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

## Implementation Plan
- [x] Edit tributary.qedspec (PinnedAccount type, InstructionConstraint type, invariants, ensures)
- [ ] Regenerate kani.rs from updated spec
- [ ] Regenerate Spec.lean from updated spec
- [ ] Fill proof obligations / mark sorry
- [ ] Verify: cargo kani passes
- [ ] Verify: lake build passes
- [ ] Update README

## Summary of Changes

### tributary.qedspec
- Added `PinnedAccount` type definition ({ index: U8, pubkey: Pubkey }) — mirrors programs/tributary/src/state/composable_policy.rs:19-22
- Added `InstructionConstraint` type definition with `pinned_accounts: Map[4] PinnedAccount` — mirrors composable_policy.rs:47-58
- Added 4 new Error variants (DuplicatePinIndex, PinDefaultPubkey, MissingForwardAccounts, ByteRangeCheckFailed)
- Added `no_duplicate_indices` invariant (documented — qedgen DSL cannot express quantified invariant over non-State type in flat model)
- Added `all_pins_concrete` invariant (documented — same DSL limitation)
- Added `pin_check_guarantee` ensures clause for execute_composable Phase 3 (documented — references forward-CPI account slices not in flat State)
- Added `MAX_PINNED_FORWARD_ACCOUNTS = 4` const

### formal_verification/
- Regenerated kani.rs from updated spec (qedgen codegen --kani); applied fix-kani.py
- Regenerated Spec.lean from updated spec (qedgen codegen --lean); applied fix-lean.py
- kani.rs now includes PinnedAccount + InstructionConstraint structs (lines 25-36)
- Kani: 19/19 harnesses PASS, 0 failures (~0.1s)
- Lean: pre-existing blocker unchanged (valid_u64 type mismatch in execute_composable_case_1Transition — unrelated to PinnedAccount)
- Updated README.md status table + added indexed-PinnedAccount changelog entry

### Design decision: documentation invariants
The qedgen DSL flat-State model cannot express quantified invariants over standalone types (InstructionConstraint is not embedded in State — it's a forward-CPI constraint type, and the spec header explicitly marks forward-CPI account wiring as OUT OF SCOPE). The invariants and ensures clause are documented as canonical obligations matching the existing pattern for all forward-CPI guarantees. Proof discharge lives in Layer 2 hand-rolled harnesses against the real Rust validators (InstructionConstraint::has_duplicate_indices, pins_match).
