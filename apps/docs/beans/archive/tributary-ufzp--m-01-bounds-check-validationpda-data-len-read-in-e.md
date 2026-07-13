---
# tributary-ufzp
title: 'M-01: Bounds-check ValidationPDA data_len read in execute_composable'
status: completed
type: bug
priority: normal
created_at: 2026-06-19T11:25:52Z
updated_at: 2026-06-19T11:28:17Z
---

ValidationPDA `data_len` is read from bytes 8-9 and used to slice `data[10..10+data_len]` without verifying `10 + data_len <= data.len()`. Slice panics if account is malformed/corrupted (DoS of composable execution).

Fix per reports/M-01-validation-pda-data-len-unchecked.md:
- [x] Add `InvalidValidationPda` variant to TributaryError
- [x] Bounds-check `data.len() >= 10` before reading data_len
- [x] Use checked_add for 10 + data_len, verify end <= data.len()
- [x] Run `anchor test` / lint / build to verify

File: programs/tributary/src/instructions/composable/execute_composable.rs:198-203

## Summary of Changes

- `programs/tributary/src/error.rs`: Added `InvalidValidationPda` variant with descriptive message.
- `programs/tributary/src/instructions/composable/execute_composable.rs`: Bounds-check `data.len() >= 10` before reading `data_len`, use `checked_add` for `10 + data_len`, verify `end <= data.len()` before slicing.

Verified: `cargo build -p tributary --release` succeeds; `cargo test -p tributary --lib` — 51 passed, 0 failed. The three remaining cargo warnings are pre-existing (dead `run_forward_cpi`/`build_forward_account_metas`) and unrelated to this change.
