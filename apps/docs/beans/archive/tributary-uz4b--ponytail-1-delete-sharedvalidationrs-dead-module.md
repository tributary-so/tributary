---
# tributary-uz4b
title: 'Ponytail #1: delete shared/validation.rs (dead module)'
status: completed
type: task
priority: high
tags:
    - ponytail
    - dead-code
created_at: 2026-06-24T12:37:32Z
updated_at: 2026-06-24T12:50:56Z
parent: tributary-9hca
---

Whole file (27 LOC) has zero callers. Both `dispatch_validation_cpi` and `split_remaining_accounts` are speculative abstractions left from an earlier composable design that was superseded by inline validation in `execute_composable::run_validation_cpi` and direct slice indexing in `run_forward_cpi`.

## Why it is dead

- `grep -r dispatch_validation_cpi programs/tributary/src` → only the definition at `shared/validation.rs:3`
- `grep -r split_remaining_accounts programs/tributary/src` → only the definition at `shared/validation.rs:13`
- The composable execute path resolves the validation/forward split inline via `num_val_accounts` arithmetic (`execute_composable.rs:237-241`, 285-288)

## Cut

- [ ] Delete `programs/tributary/src/shared/validation.rs`
- [ ] Remove `pub mod validation;` from `programs/tributary/src/shared/mod.rs`
- [ ] `cargo build-sbf` (or whatever the local build cmd is)
- [x] `cargo test --lib` — 60 passed, 0 failed

## Verification

No behavior change. If the build breaks, something was importing it that grep missed.

## Files
- `programs/tributary/src/shared/validation.rs` (delete)
- `programs/tributary/src/shared/mod.rs` (one-line removal)

## Summary of Changes

- Deleted `programs/tributary/src/shared/validation.rs` (27 LOC).
- Removed `pub mod validation;` from `programs/tributary/src/shared/mod.rs`.
- `cargo check` clean; `cargo test --lib` 60/0.

No behavior change. Pure dead-code removal.
