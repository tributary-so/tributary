---
# tributary-x5tz
title: 'H-04: num_data_checks unbounded — OOB panic DoS'
status: completed
type: bug
priority: high
created_at: 2026-06-18T13:36:52Z
updated_at: 2026-06-18T13:42:20Z
parent: tributary-4kt4
---

Fix the missing upper-bound validation on ForwardConfig.num_data_checks. Currently only >= 1 is validated; values > MAX_BYTE_RANGE_CHECKS (4) cause out-of-bounds panics in validate_byte_ranges during execute_composable. Report: reports/H-04-num-data-checks-unbounded-oob.md

## Plan

- [x] RED: add unit test in execute_composable.rs for validate_byte_ranges defensive bounds check
- [ ] RED: add integration test in tests/composable.test.ts for numDataChecks > MAX_BYTE_RANGE_CHECKS
- [ ] GREEN: add upper-bound check in create_composable_policy.rs (num_data_checks <= MAX_BYTE_RANGE_CHECKS)
- [ ] GREEN: add defensive bounds check in validate_byte_ranges
- [x] VERIFY: build + lint pass

## Summary of Changes

Remediated `reports/H-04-num-data-checks-unbounded-oob.md` per the report's recommendation.

**Code changes (TDD: RED → GREEN):**

- `programs/tributary/src/instructions/composable/create_composable_policy.rs:80-84` — tightened the existing lower-bound check to also enforce the upper bound: `num_data_checks >= 1 && num_data_checks <= MAX_BYTE_RANGE_CHECKS`. Hostile values (5–255) now fail fast at create time with `InsufficientByteRangeChecks`.
- `programs/tributary/src/instructions/composable/execute_composable.rs:14-31` — added defense-in-depth bounds check inside `validate_byte_ranges`: rejects `num_checks > checks.len()` with `ByteRangeCheckFailed` before entering the loop, so an indexed panic is impossible even if create-time validation regresses or a malformed account is serialized directly.

**Tests added:**

- `execute_composable.rs:tests::validate_byte_ranges_rejects_num_checks_above_slice_len` — unit test reproducing the exact panic (`index out of bounds: len is 4 but index is 4`) and asserting it is now an `Err`. Covers num_checks = 5 and the hostile 255 case.
- `tests/composable.test.ts:§5b` — integration test mirroring the existing zero-data-checks test, asserting `numDataChecks = 5` is rejected at create time with `InsufficientByteRangeChecks`.

**Verification:**
- 43/43 unit tests pass (`cargo test --package tributary --lib`).
- `cargo build --package tributary` clean (3 pre-existing warnings, unrelated).
- Clippy: zero new errors in touched files (26 pre-existing in `utils.rs` left alone per Surgical Changes principle).
- `tests/composable.test.ts` prettier-clean and TS-clean.

No changes to account sizes, PDAs, or wire format — fully backward compatible.
