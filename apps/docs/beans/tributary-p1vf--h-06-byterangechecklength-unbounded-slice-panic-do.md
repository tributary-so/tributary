---
# tributary-p1vf
title: 'H-06: ByteRangeCheck.length unbounded — slice panic DoS'
status: completed
type: bug
priority: high
created_at: 2026-06-18T13:52:57Z
updated_at: 2026-06-18T13:58:31Z
---

Fix the missing length<=8 validation on ByteRangeCheck. Currently only offset+length<=1024 is checked, so length=255 passes creation but panics at `self.expected[..255]` (expected is [u8;8]) during execute_composable. Report: reports/H-06-byte-range-check-length-unbounded.md

## Plan

- [ ] RED: add unit test in state/composable_policy.rs for ByteRangeCheck::validate defensive length<=8 check
- [x] RED: add integration test in tests/composable.test.ts for ByteRangeCheck.length > 8
- [ ] GREEN: add length<=8 guard in create_composable_policy.rs
- [ ] GREEN: add defensive length>8 early-return in ByteRangeCheck::validate
- [x] VERIFY: build + lint + tests pass

## Summary of Changes

Remediated `reports/H-06-byte-range-check-length-unbounded.md` per the report's recommendation.

**Code changes (TDD: RED → GREEN):**

- `programs/tributary/src/state/composable_policy.rs:13-32` — added defense-in-depth early-return at the top of `ByteRangeCheck::validate`: rejects `length > 8` with `false` before the `&self.expected[..self.length]` slice can panic. `expected` is a fixed `[u8; 8]`, so without this guard a malformed account (or a regression in create-time validation) bricks every `execute_composable` call with an OOB panic.
- `programs/tributary/src/instructions/composable/create_composable_policy.rs:85-108` — added a `require!(check.length <= 8, TributaryError::ByteRangeCheckFailed)` inside the existing per-check validation loop, with a documentation comment explaining why the bound is mandatory. Hostile values (9–255) now fail fast at create time.

**Tests added:**

- `state/composable_policy.rs:tests::validate_rejects_length_above_eight_array_bound` — unit test reproducing the exact panic (`range end index 16 out of range for slice of length 8` at `composable_policy.rs:20:56`) and asserting it now returns `false` instead. Covers length = 16 and the hostile length = 255 case.
- `tests/composable.test.ts:§5c` — integration test mirroring the H-04 §5b style: creates a policy with `length = 16` (offset+length = 16 ≤ 1024 so the existing overflow check passes) and asserts the create-time guard rejects it with `ByteRangeCheckFailed`.

**Verification:**
- 44/44 unit tests pass (`cargo test --package tributary --lib`), +1 from baseline (43).
- `cargo build --package tributary` clean (3 pre-existing warnings, none in touched files).
- Clippy: zero new warnings in touched files (verified by stash+reclippy on baseline — the 3 warnings on these files pre-date this change).
- `tests/composable.test.ts` prettier-clean.

No changes to account sizes, PDAs, or wire format — fully backward compatible.
