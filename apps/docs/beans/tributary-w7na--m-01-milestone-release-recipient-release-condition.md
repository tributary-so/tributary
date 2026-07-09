---
# tributary-w7na
title: 'M-01: Milestone RELEASE_RECIPIENT release-condition is permanently deadlocked'
status: todo
type: bug
priority: normal
tags:
    - security
    - audit
created_at: 2026-07-09T12:05:35Z
updated_at: 2026-07-09T12:05:35Z
---

## Security Audit Finding (M-01)

**Severity:** Medium
**Report:** `reports/M-01-milestone-release-recipient-deadlock.md`
**Files:** `programs/tributary/src/instructions/payment/execute_payment.rs:181-188`, `programs/tributary/src/shared/schedule.rs:332-347`, `programs/tributary/src/policies/milestone.rs:46-49`

### Issue

A `PaymentPolicy::Milestone` configured with `release_condition` bit 3 (`RELEASE_RECIPIENT`, `0b1000`) can never be executed by any caller. Two checks impose contradictory caller-identity requirements:

1. `validate_policy_execution` (schedule.rs:342) requires `signers.caller == signers.recipient`.
2. `execute_payment` (execute_payment.rs:181-188) blocks the recipient from being the caller for any policy that is not `PayAsYouGo` / `UpTo` — Milestone included.

Gateway signer / owner fail check (1); recipient is blocked by (2). No valid caller exists (except the degenerate case where `recipient == gateway.signer` or `recipient == owner`). `validate_milestone_policy` accepts bit 3 (only enforces mutual exclusivity of signer bits), so the dead config is silently accepted at create time.

No in-program fund lock (Milestone is a pull-payment; tokens stay with the user) and no theft — this is a broken-authorization / availability defect: the recipient is permanently denied that milestone payout.

### Fix

Decide the intended semantics, then reconcile:

- **Option A — recipient triggers release directly:** exempt a `Milestone` carrying `RELEASE_RECIPIENT` from the `181-188` block (mirror the PayAsYouGo/UpTo exemption).
- **Option B — recipient co-signs alongside gateway/owner caller:** change the schedule gate from an exclusive identity check to an additional co-signer requirement.

Either way:
- Add a create-time guard in `validate_milestone_policy` so an unreachable config is rejected loudly (or the documented degenerate-only constraint is asserted explicitly).
- Update the contradictory comment at `execute_payment.rs:178-180` to match the chosen semantics.

## Acceptance Criteria

- [ ] Chosen semantics documented; code + comment agree
- [ ] Create-time guard rejects the dead configuration (or asserts the valid one)
- [ ] Unit test: a `RELEASE_RECIPIENT` milestone with a distinct recipient is releasable by the intended caller
- [ ] Unit test: wrong caller is still rejected
