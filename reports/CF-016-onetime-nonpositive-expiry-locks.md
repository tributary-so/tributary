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
