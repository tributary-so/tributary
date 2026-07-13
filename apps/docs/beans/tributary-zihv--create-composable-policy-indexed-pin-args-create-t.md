---
# tributary-zihv
title: 'create_composable_policy: indexed pin args + create-time validation'
status: completed
type: task
priority: high
created_at: 2026-07-10T10:18:10Z
updated_at: 2026-07-10T15:19:49Z
parent: tributary-je1p
---

## Files
- `programs/tributary/src/instructions/composable/create_composable_policy.rs`

## Changes
- [x] Change the create args struct: `pinned_accounts: [Pubkey; MAX_PINNED_ACCOUNTS]` → `pinned_accounts: [PinnedAccount; MAX_PINNED_FORWARD_ACCOUNTS]` (or accept a vec of (index, pubkey) tuples and pack)
- [ ] Add create-time validation:
  - [ ] No duplicate indices among active pins (pinned_accounts[0..num].index all distinct)
  - [ ] All active pins have pubkey != Pubkey::default() (reject default-pubkey entries in active set)
  - [ ] num_pinned_accounts <= MAX_PINNED_FORWARD_ACCOUNTS (existing check, keep)
- [ ] Degenerate-pin guard unchanged (forward enabled requires num_pinned > 0 OR post_validation is ProgramCall)
- [ ] Update ValidationPda serialization comments (the create handler writes ValidationPda bytes — ensure pinned_accounts field offsets for VALIDATION PDA are NOT changed; only InstructionConstraint changes)
- [ ] Update existing unit tests in create_composable_policy.rs
- [ ] Add unit test: duplicate index rejected at create
- [ ] Add unit test: default pubkey in active set rejected at create
- [x] `cargo test` passes — 179 tests, 0 failures

## Summary of Changes

- **error.rs**: Added `DefaultPinPubkey` error variant for zero-pubkey pins in active validation set.
- **create_composable_policy.rs**:
  - `ValidationInit.pinned_accounts` changed from `[Pubkey; MAX_PINNED_ACCOUNTS]` → `[PinnedAccount; MAX_PINNED_FORWARD_ACCOUNTS]` (indexed pin model, consistent with InstructionConstraint).
  - `validate_init` now checks: duplicate indices, default pubkeys in active set, index < MAX_PINNED_ACCOUNTS.
  - `init_validation_pda` packs active PinnedAccount entries into the positional `[Pubkey; MAX_PINNED_ACCOUNTS]` array via `pin.index` — **on-chain ValidationPda byte layout unchanged**.
  - Updated SAFETY comment to document the args→PDA packing relationship.
  - Added 6 new tests: valid 1-pin, valid 2-pin, duplicate index rejected, default pubkey rejected, index OOB rejected, disabled spec ignores pins.
- All 179 unit tests pass.
