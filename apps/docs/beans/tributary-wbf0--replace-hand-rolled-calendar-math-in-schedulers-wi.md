---
# tributary-wbf0
title: Replace hand-rolled calendar math in schedule.rs with the `time` crate
status: draft
type: task
created_at: 2026-06-29T13:44:11Z
updated_at: 2026-06-29T13:44:11Z
---

## Context

`programs/tributary/src/shared/schedule.rs` hand-rolls all calendar-month
arithmetic used by `PaymentPolicy::Subscription` and `ComposablePolicy`
schedules. The relevant code:

- `add_months(timestamp, months)` — converts Unix ts → (y,m,d), adds months,
  clamps day to month-end, converts back. Uses **O(years)** and **O(months)**
  iteration loops (lines 102–130 for year/month decomposition, 172–185 for
  re-accumulation).
- `skip_months(current_due, current_timestamp, months)` — **bounded loop**
  (cap `MAX_MONTHLY_ITERATIONS = 1200`) calling `add_months` repeatedly until
  `next_due > current_timestamp`.
- `is_leap_year`, `get_days_in_month`, epoch-conversion helpers — ~100 lines
  of maintained calendar primitives.

## The Problem (as originally raised)

The premise was that the month arithmetic is "inaccurately implemented".

**Correction surfaced during investigation:** the day-clamping behavior
(Jan 31 + 1 month → Feb 28/29, and the cascading "day gets capped to 28th
after passing through February") is **NOT a bug — it is correct Gregorian
calendar semantics.** Both the hand-rolled code and any compliant library
(`time`, `chrono`) produce identical results. The existing tests at
`schedule.rs:857` and `schedule.rs:875` assert this clamping as *expected*
behavior.

So this bean is **not** a correctness fix. It is a maintainability +
compute-units consideration.

## Proposed Solution

Swap the hand-rolled math for the [`time`](https://crates.io/crates/time)
crate:

```toml
# programs/tributary/Cargo.toml
time = { version = "0.3", default-features = false }
```

`time` is `#![no_std]` and compiles to Solana's SBF target. The single
primitive that replaces the bulk of the hand-rolled code:

```rust
use time::{Date, Month};

let d = Date::from_calendar_date(2024, Month::January, 31)?;
let next = d.checked_add_months(1)?; // → 2024-02-29 (correct leap clamp)
```

### Why `time` over `chrono`

- `chrono` (with `default-features = false`) also works via
  `NaiveDate::checked_add_months`, but pulls heavier transitive weight
  (`iana-time-zone`-adjacent machinery, larger binary).
- `time` is the leaner, more modern pick and is the one recommended for
  Solana programs.
- Both clamp day-of-month identically (Gregorian standard).

## What This Change Buys

1. **O(1) instead of O(months)** for `skip_months` and the year/month
   iteration loops in `add_months`. Current loops are bounded at 1200
   iterations but burn compute units linearly.
2. **Drops ~100 lines** of self-maintained calendar primitives
   (`is_leap_year`, `get_days_in_month`, epoch ↔ (y,m,d) conversion) —
   removes surface for off-by-one bugs.
3. Smaller diff for future schedule-related features (no need to grow
   the hand-rolled code further).

## What This Change Does NOT Buy

- ❌ No correctness improvement (the current math is already correct).
- ❌ No change to day-clamping semantics (Jan 31 → Feb 28/29 stays).

## Decision Gate — Do NOT Promote From `draft` Until Answered

This is a "surgical, only-if-worth-it" change (ponytail: dependency addition
must earn its place). Promote to `todo` only if **at least one** is true:

- [ ] CU profiling shows the monthly-schedule advancement path is a hot
      spot (the 1200-iteration cap is rarely hit in practice — most
      advancements skip 1–2 months).
- [ ] A new schedule feature would otherwise force re-growth of the
      hand-rolled calendar code.
- [ ] Maintenance burden of the calendar primitives is actively causing
      bugs (none currently known — all tests pass).

If none of the above is satisfied, **close this bean as scrapped** with
reason "current implementation is correct and cheap; no measured payoff
for the dependency."

## Migration Plan (if promoted)

1. Add `time` dep with `default-features = false`.
2. Rewrite `add_months` to use `Date::from_calendar_date` +
   `checked_add_months` + back to Unix timestamp.
3. Delete `is_leap_year`, `get_days_in_month`, the year/month loops.
4. Keep `skip_months` as-is (it's a thin caller) OR collapse it into
   a single `checked_add_months` with a computed jump count.
5. Re-run the existing chrono-based tests verbatim — they pin the
   exact calendar semantics and must continue to pass unchanged.
6. Verify CU delta with `anchor test` + a CU log on
   `execute_payment` for a monthly policy.

## References

- File: `programs/tributary/src/shared/schedule.rs`
- `time` crate docs: https://time-rs.github.io/book/api/date.html
- Related audit note referenced in code: `reports/M-04-inconsistent-month-arithmetic.md`
  (the M-04 fix landed as the current calendar-correct implementation;
   this bean is orthogonal to M-04).
