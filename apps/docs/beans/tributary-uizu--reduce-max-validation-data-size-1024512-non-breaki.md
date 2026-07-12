---
# tributary-uizu
title: Reduce MAX_VALIDATION_DATA_SIZE 1024→512 (non-breaking)
status: todo
type: task
priority: normal
created_at: 2026-07-12T19:12:17Z
updated_at: 2026-07-12T19:13:23Z
parent: tributary-osli
---

Parent tributary-osli. NON-BREAKING — ValidationPda.data is the trailing field, so shrinking shifts no other field offset. Old mainnet accounts (1024B data) remain readable (new code reads 512, ignores trailing 512B).

## Touch points
- `programs/tributary/src/state/validation_pda.rs:3` — `pub const MAX_VALIDATION_DATA_SIZE: usize = 1024` → `512`.
- `validation_pda.rs:40` — SIZE comment math (1100 → 588).
- `validation_pda.rs:127` — `size_covers_full_layout` unit test: `assert_eq!(ValidationPda::SIZE, 1100)` → `588`.
- `create_composable_policy.rs:318` — acceptance check uses the const symbolically (auto-tracks, no edit).
- Rent: ValidationPda account drops 1100B → 588B (~0.0054 SOL → ~0.0034 SOL per PDA; ~0.002 SOL saved × 2 PDAs per composable with both pre+post validation).

## Acceptance criteria (TDD)
- [ ] Update the const + SIZE comment + the two literals in the test.
- [ ] `cargo test` in programs/tributary — `size_covers_full_layout` passes with 588.
- [ ] `borsh_round_trip_preserves_fields` still passes (unchanged field order).
- [ ] `cargo build` clean.
- [ ] Verify no other literal `1024` or `1100` references the validation data size anywhere in programs/.
- [ ] No qedspec change (out of scope). No SDK change (Buffer is variable-length).
