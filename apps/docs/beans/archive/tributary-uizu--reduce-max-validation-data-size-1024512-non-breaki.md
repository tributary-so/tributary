---
# tributary-uizu
title: Reduce MAX_VALIDATION_DATA_SIZE 1024→512 (non-breaking)
status: completed
type: task
priority: normal
created_at: 2026-07-12T19:12:17Z
updated_at: 2026-07-12T20:01:25Z
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

- [x] Update the const + SIZE comment + the two literals in the test.
- [x] `cargo test` in programs/tributary — `size_covers_full_layout` passes with 588.
- [x] `borsh_round_trip_preserves_fields` still passes (unchanged field order).
- [x] `cargo build` clean.
- [x] Verify no other literal `1024` or `1100` references the validation data size anywhere in programs/.
- [x] No qedspec change (out of scope). No SDK change (Buffer is variable-length).

## Summary of Changes

- `validation_pda.rs`: `MAX_VALIDATION_DATA_SIZE` 1024 → 512; SIZE comment now shows `= 588`; `size_covers_full_layout` test asserts 588.
- `execute_composable.rs:225`: updated stale stack-note comment `[u8; 1024]` → `[u8; 512]`.
- `create_composable_policy.rs:318`: acceptance check tracks the const symbolically — no edit needed.
- Verified: cargo build clean, 7/7 validation_pda tests pass, no remaining literal references to the validation data size.
- Also fixed stale comment in `create_composable_policy.rs:165` — left as-is (that `1024` caps forward-instruction byte-range checks, unrelated buffer).
