---
# tributary-tbxv
title: 'Differential proptest: schedule.rs calendar math vs chrono oracle'
status: completed
type: task
priority: normal
created_at: 2026-06-30T07:34:26Z
updated_at: 2026-06-30T14:26:38Z
---

DECISION (post-grilling, 2026-06-30): Keep hand-rolled month/day math in programs/tributary/src/shared/schedule.rs. Prove correctness via differential property test against chrono (already a dev-dep) instead of swapping in time/chrono as a runtime dep.

## Why not the time crate (original proposal)
- time 0.3 has NO month-add (deliberately omitted as ambiguous). It would delete the safe conversion loops but KEEP the day-clamp (schedule.rs:160-166) — the only part an auditor actually burns hours on. Net audit win ~0.
- Adds a brand-new runtime supply-chain crate to vet + a BPF-compile risk (neither time nor chrono is a common Solana-program dep; unverified under sbf-solana-solana).

## Why not chrono-as-runtime-dep (option B)
- chrono checked_add_months DOES match the M-04 clamp semantic and would delete the riskiest ~40 lines. Rejected for now: new runtime dep + its own RUSTSEC history + BPF spike needed. Escalate to this ONLY if a future auditor specifically flags the hand-rolled math.

## Chosen path (C): differential proptest
Add a proptest that asserts, over the full i64 timestamp range and all PaymentFrequency variants:
- add_months(ts, n) == chrono DateTime::checked_add_months(Months::new(n)) (positive n only — see dead-code note)
- calculate_next_payment_due(due, freq, now) advances monotonically and lands on the chrono-derived date
- skip_months never exceeds MAX_MONTHLY_ITERATIONS (1200)

Goal: hand the auditor a fuzz report proving equivalence to a known-good oracle, at zero new supply-chain surface and zero BPF risk.

## Scope / todos
- [x] Add proptest dev-dep to programs/tributary/Cargo.toml (already have chrono dev-dep as oracle)
- [x] Write differential proptest module in schedule.rs tests (positive months only — the production path)
- [x] Verified negative-month branch dead in prod (skip_months only passes {1,3,6,12}). Marked ponytail: with ceiling note + upgrade path; excluded from fuzz (positive n only).
- [x] Fix orphaned doc citation: removed all 3 references to non-existent reports/M-04-inconsistent-month-arithmetic.md (schedule.rs:15, composable_policy.rs:107, execute_composable.rs:863). IDL regenerated accordingly.
- [x] cargo test (88 passed, incl. 3 new proptests). anchor build (sbf) green; on-chain .so byte-identical (all changes are #[cfg(test)] or comments). jest integration needs full anchor env (Surfpool holds 8899); unaffected since bytecode unchanged.

## Deferred alternatives (do not implement unless auditor flags)
- (A) time crate — rejected, see above
- (B) chrono as runtime dep — held in reserve

## Out of scope
- Rewriting the calendar math
- Changing PolicyType layout or PaymentFrequency
- The MAX_MONTHLY_ITERATIONS DoS guard (stays regardless — neither crate owns the advance-until-due loop)



## Summary of Changes

- **programs/tributary/Cargo.toml**: added `proptest = "1"` to `[dev-dependencies]` (chrono already present as oracle).
- **programs/tributary/src/shared/schedule.rs**: new `#[cfg(test)] mod proptests` with 3 differential property tests:
  1. `add_months_matches_chrono_for_positive_n` — proves `add_months(ts, n) == chrono::checked_add_months` for n in 1..=12, ts in [0, ~2400]. Fuzz range restricted to ts >= 0 because `add_months` decomposes via `ts % 86400` which takes the dividend sign for negative ts (1-day divergence from chrono); unreachable in prod (Solana Clock always positive) — documented in-module.
  2. `next_due_monotonic_and_lands_on_chrono_date` — for every calendar-variant PaymentFrequency, proves `calculate_next_payment_due` advances strictly past `now` AND lands exactly on the chrono-derived date (iterative clamp-at-each-step matches chrono per-call clamp). Gaps needing > MAX_MONTHLY_ITERATIONS steps excluded (cap test's domain).
  3. `skip_months_respects_max_iterations_cap` — proves the 1200-iteration DoS guard: gaps >= 1200 months bail with ArithmeticOverflow; gaps < 1200 succeed. Uses day=15 (no clamping) so iteration count = calendar-month gap.
  Also: marked the dead-in-prod negative-month branch (`while new_month < 1`) with a `ponytail:` comment naming the ceiling and upgrade path; fixed the orphaned M-04 doc citation at module head (now points to the proptest module).
- **programs/tributary/src/state/composable_policy.rs** & **programs/tributary/src/instructions/composable/execute_composable.rs**: removed the same orphan M-04 citation; IDL regenerated to reflect the doc-comment change.
- **Cargo.lock**: proptest + transitive dev-deps materialized.

Verification: `cargo test --lib` -> 88 passed / 0 failed. `cargo fmt --check` clean. `cargo clippy` on schedule.rs clean (25 pre-existing errors in unrelated files out of scope). `anchor build --arch sbf` green (.so byte-identical — all changes are test-only or comments).
