---
# tributary-tbxv
title: 'Differential proptest: schedule.rs calendar math vs chrono oracle'
status: todo
type: task
priority: normal
created_at: 2026-06-30T07:34:26Z
updated_at: 2026-06-30T07:34:26Z
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
- [ ] Add proptest dev-dep to programs/tributary/Cargo.toml (already have chrono dev-dep as oracle)
- [ ] Write differential proptest module in schedule.rs tests (positive months only — the production path)
- [ ] Verify the negative-month branch (schedule.rs:151-158, new_month < 1) is dead in prod (skip_months only passes {1,3,6,12}); if dead, either delete it or mark ponytail: and exclude from fuzz
- [ ] Fix orphaned doc citation: schedule.rs:15 references reports/M-04-inconsistent-month-arithmetic.md which does NOT exist in reports/ (bean tributary-7e7w is a DIFFERENT, scrapped M-04). Correct or remove the link.
- [ ] Run anchor test to confirm green

## Deferred alternatives (do not implement unless auditor flags)
- (A) time crate — rejected, see above
- (B) chrono as runtime dep — held in reserve

## Out of scope
- Rewriting the calendar math
- Changing PolicyType layout or PaymentFrequency
- The MAX_MONTHLY_ITERATIONS DoS guard (stays regardless — neither crate owns the advance-until-due loop)
