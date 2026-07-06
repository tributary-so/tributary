---
# tributary-vtne
title: i64 overflow in validate_policy_execution + advance_policy (schedule.rs)
status: completed
type: bug
priority: high
created_at: 2026-07-01T15:46:24Z
updated_at: 2026-07-03T07:27:45Z
---

Kani found that *current_period_start + *period_length_seconds as i64 can overflow i64 when period_length_seconds > i64::MAX or when the sum exceeds i64::MAX. Panics in debug, wraps silently in release (wrong period comparison). Found by verify_payg_pull_bounded harness.

## Finding

Kani's hand-rolled harness `verify_payg_pull_bounded` (in
`programs/tributary/tests/kani_pure_fns.rs`) fails with
`attempt to add with overflow` against the REAL
`validate_policy_execution`.

## Root cause

`programs/tributary/src/shared/schedule.rs:359` (PAYG branch of
`validate_policy_execution`):

```rust
if current_time >= *current_period_start + *period_length_seconds as i64 {
```

Two overflow vectors:

1. **`as i64` cast wraps.** `period_length_seconds` is `u64`. If it exceeds
   `i64::MAX` (~9.2e18), the `as i64` cast wraps to a negative number.
   In release mode this is silent wrapping; in debug mode it's UB-checked
   by Kani.

2. **Addition overflows.** Even with `period_length_seconds <= i64::MAX`,
   `current_period_start + (period_length_seconds as i64)` can exceed
   `i64::MAX` if both values are large positive i64s.

Same pattern at `schedule.rs:463` in `advance_policy`:
```rust
if current_time >= *current_period_start + *period_length_seconds as i64 {
```

## Impact

- **Debug mode (tests, Kani):** panic on overflow.
- **Release mode (mainnet):** silent wraparound. The period-elapsed check
  compares against a wrapped (possibly negative) value, so the reset-vs-
  accumulate decision may be wrong. A policy whose period boundary
  calculation wraps could allow accumulation past the intended cap, or
  reset when it shouldn't.

In practice: `period_length_seconds` is set at policy creation with
`requires period_secs > 0` but NO upper bound. A caller passing
`u64::MAX` as the period triggers this.

## Fix

Replace bare `+` with `saturating_add` in both sites:

```rust
if current_time >= (*current_period_start).saturating_add(*period_length_seconds as i64) {
```

Or bound `period_length_seconds` at creation: `requires period_secs <= i64::MAX as u64`.

## Verification

After the fix, remove the `kani::assume` bounds in
`kani_pure_fns.rs` (the `period_secs <= 1_000_000_000_000` workaround)
and re-run — the harness should pass without the assumption.

## Found by

Hand-rolled Kani harness `verify_payg_pull_bounded` at
`programs/tributary/tests/kani_pure_fns.rs`.


## fix-kani.py dependency (Layer 1 masking)

The spec-model Kani harness (Layer 1, `formal_verification/kani.rs`) uses
`saturating_add` in `fix-kani.py` to work around this exact overflow:

```python
# fix-kani.py, Bug E.2:
text = text.replace(
    's.current_period_start + s.period_length_seconds',
    's.current_period_start.saturating_add(s.period_length_seconds)',
)
```

This **masks** the bug at Layer 1 — the spec-model harness can't detect it
because the fix replaces the real (broken) bare `+` with the intended
`saturating_add`. The bug IS caught by Layer 2 (`kani_pure_fns.rs`) which
calls the real code directly.

**When fixing this bug in schedule.rs**, also remove the `saturating_add`
replacement from `fix-kani.py` Bug E.2 so Layer 1 can verify the fix too.
If the real code uses `saturating_add` (the correct fix), the spec-model
harness should emit bare `+` (which the codegen already does) and let the
`saturating_add` in the real transition function handle it — no post-
processor intervention needed.

## Summary of Changes

- `schedule.rs:359` (`validate_policy_execution` PAYG branch) and `schedule.rs:463` (`advance_policy`): replaced bare `*current_period_start + *period_length_seconds as i64` with `(*current_period_start).saturating_add(*period_length_seconds as i64)`. Saturates at `i64::MAX` instead of panicking (debug) / wrapping (release).
- `kani_pure_fns.rs`: removed the `period_secs <= 1_000_000_000_000` / `period_start <= 1_000_000_000_000` workaround assumes from `verify_payg_pull_bounded`, `verify_payg_rejects_period_breach`, and `verify_payg_advance_preserves_cap`. Updated the two harness-internal mirroring guards (lines 280, 335) to `saturating_add` so the harness logic matches the fixed real code.
- `fix-kani.py`: removed the Bug E.2 `saturating_add` post-processor replacement (lines 96-106) that masked the bug at Layer 1. The real code now uses `saturating_add`, so the spec-model codegen's bare `+` no longer needs masking.
- Added regression test `payg_period_guard_no_overflow_near_i64_max` (`schedule.rs`) exercising `current_period_start = i64::MAX - 100` + `period_length_seconds = 3600` — would panic under the old bare `+`.

### Verification
- `cargo test --lib`: 140 passed, 0 failed.
- Kani (Layer 2): `verify_payg_pull_bounded` 0/1710 failed; `verify_payg_rejects_period_breach` ✓; `verify_payg_advance_preserves_cap` ✓ — all WITHOUT the workaround assumes.

### Note
The bean's claim that creation enforces "NO upper bound" on `period_length_seconds` is outdated: `policies/pay_as_you_go.rs:23` already requires `period_length_seconds <= i64::MAX as u64` (vector #1 — cast wrap — is prevented at creation). The `saturating_add` fix addresses vector #2 (addition overflow), which is what Kani caught.
