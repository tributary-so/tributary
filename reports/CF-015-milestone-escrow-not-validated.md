# CF-015: Milestone `escrow_amount` Not Validated Against Sum of `milestone_amounts`

> **Severity:** 🔵 3 (LOW)  
> **Category:** Logic / Validation Gap  
> **File:** `programs/tributary/src/policies/milestone.rs:10–52`  
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Description

`validate_milestone_policy` checks `escrow_amount > 0` and each `milestone_amounts[i] > 0`, but never verifies:

```rust
escrow_amount >= milestone_amounts[0..total_milestones].iter().sum()
```

A policy can be created with `escrow_amount = 1` and `milestone_amounts = [1000, 2000, 3000, 4000]`.

`escrow_amount` is metadata — not enforced at execute time (execution pulls from the user's delegated balance, gated by `delegated_amount`). But off-chain indexers, dashboards, or auditors relying on `escrow_amount` for total-liability accounting will undercount by up to 4×.

## Patch

```diff
 // In validate_milestone_policy:
+let sum: u64 = milestone_amounts[..total_milestones as usize]
+    .iter()
+    .try_fold(0u64, |acc, &v| acc.checked_add(v))
+    .ok_or(TributaryError::ArithmeticOverflow)?;
+require!(escrow_amount >= sum, TributaryError::InvalidAmount);
```
