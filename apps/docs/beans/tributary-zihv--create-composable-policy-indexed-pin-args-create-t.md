---
# tributary-zihv
title: 'create_composable_policy: indexed pin args + create-time validation'
status: todo
type: task
priority: high
created_at: 2026-07-10T10:18:10Z
updated_at: 2026-07-10T10:18:10Z
parent: tributary-je1p
---

## Files
- `programs/tributary/src/instructions/composable/create_composable_policy.rs`

## Changes
- [ ] Change the create args struct: `pinned_accounts: [Pubkey; MAX_PINNED_ACCOUNTS]` → `pinned_accounts: [PinnedAccount; MAX_PINNED_FORWARD_ACCOUNTS]` (or accept a vec of (index, pubkey) tuples and pack)
- [ ] Add create-time validation:
  - [ ] No duplicate indices among active pins (pinned_accounts[0..num].index all distinct)
  - [ ] All active pins have pubkey != Pubkey::default() (reject default-pubkey entries in active set)
  - [ ] num_pinned_accounts <= MAX_PINNED_FORWARD_ACCOUNTS (existing check, keep)
- [ ] Degenerate-pin guard unchanged (forward enabled requires num_pinned > 0 OR post_validation is ProgramCall)
- [ ] Update ValidationPda serialization comments (the create handler writes ValidationPda bytes — ensure pinned_accounts field offsets for VALIDATION PDA are NOT changed; only InstructionConstraint changes)
- [ ] Update existing unit tests in create_composable_policy.rs
- [ ] Add unit test: duplicate index rejected at create
- [ ] Add unit test: default pubkey in active set rejected at create
- [ ] `cargo test` passes
