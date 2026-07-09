---
# tributary-ldaz
title: 'M-01: Fix Milestone RELEASE_RECIPIENT release-condition deadlock'
status: in-progress
type: bug
priority: high
created_at: 2026-07-09T12:23:06Z
updated_at: 2026-07-09T12:30:15Z
parent: tributary-3nhr
---

**Finding M-01 (Medium)** — Milestone `RELEASE_RECIPIENT` release-condition is deadlocked.

### Root cause

Two contradictory checks in `execute_payment`:

- `shared/schedule.rs:342-347` (`validate_policy_execution`): for
  `release_condition & RELEASE_RECIPIENT != 0`, requires `caller == recipient`.
- `instructions/payment/execute_payment.rs:181-188`: rejects `fee_payer == recipient`
  for Milestone policies (only PayAsYouGo/UpTo are allow-listed).

Result: no signer can satisfy both → escrow permanently locked. A Milestone
policy created with `release_condition & 0b1000` can never execute.

### Fix

Extend the allow-list at `execute_payment.rs:181-188` to permit the recipient
as caller when the milestone release condition is `RELEASE_RECIPIENT` (bit 3).
Fix the misleading comment at lines 178-180 that contradicts
`validate_policy_execution`.

### Acceptance criteria

- [ ] Rust unit test: `execute_payment` path allows recipient caller for RELEASE_RECIPIENT milestone
- [ ] Misleading comment corrected
- [ ] `cargo test` passes (programs/tributary)
- [ ] qedspec updated if contract behavior changes
