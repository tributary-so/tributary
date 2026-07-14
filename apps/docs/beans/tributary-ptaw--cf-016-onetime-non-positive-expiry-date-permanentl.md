---
# tributary-ptaw
title: 'CF-016: OneTime non-positive expiry_date permanently locks policy'
status: completed
type: bug
priority: normal
created_at: 2026-07-13T20:06:45Z
updated_at: 2026-07-13T21:02:39Z
parent: tributary-gq3x
---

# CF-016: OneTime Non-Positive `expiry_date` Permanently Locks Policy

> **Severity:** 🔵 3 (LOW)
> **Category:** Logic / State Machine Inconsistency
> **File:** `programs/tributary/src/shared/schedule.rs:414–416`
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Description

PayAsYouGo guards non-positive expiry as "no gate":

```rust
// PayAsYouGo (schedule.rs:382–386) — SAFE
if let Some(exp) = expiry_date {
    if *exp > 0 {
        require!(current_time <= *exp, TributaryError::PolicyExpired);
    }
}
```

OneTime does NOT:

```rust
// OneTime (schedule.rs:414–416) — UNCONDITIONAL
if let Some(exp) = expiry_date {
    require!(current_time <= *exp, TributaryError::PolicyExpired);
}
```

A OneTime policy with `expiry_date = Some(0)` or `Some(-1)` can never execute (`current_time` is always positive, `<= 0` is always false). The create-time validator (`validate_one_time_policy`) does not reject this when `due_date <= 0` (the `if due_date > 0` guard skips the expiry check).

## Patch

```diff
 // schedule.rs:414–416
 if let Some(exp) = expiry_date {
+    if *exp > 0 {
         require!(current_time <= *exp, TributaryError::PolicyExpired);
+    }
 }
```

Or validate at create time:

```diff
 // policies/one_time.rs validate_one_time_policy
 if let Some(exp) = expiry_date {
+    require!(*exp > 0, TributaryError::InvalidPaymentDueDate);
     // existing checks...
 }
```

## Summary of Changes

CF-016 fixed in `programs/tributary/src/shared/schedule.rs` (OneTime arm of `validate_policy_execution`):

- Wrapped the unconditional `require!(current_time <= *exp, ...)` in `if *exp > 0`, mirroring the existing PayAsYouGo arm (lines 416–420). `Some(0)`/`Some(neg)` is now treated as "no gate" — matches ADR-0024 semantics (`Some(ts)` with `ts > 0` rejects) and unblocks policies that previously could never execute.
- Added regression test `onetime_zero_or_negative_expiry_treated_as_no_gate` mirroring `payg_zero_or_negative_expiry_treated_as_no_gate`.

Chose the execute-time gate fix over the create-time validator alternative because: (a) it matches the file's existing PayAsYouGo convention, (b) it also unblocks already-created policies with sentinel expiry, (c) it matches the documented ADR-0024 contract (`Some(ts>0)` rejects).

All 66 `schedule::` tests pass.
