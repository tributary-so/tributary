# CF-020: Milestone `current_milestone > 0` Allowed at Creation

> **Severity:** ⚪ 2 (INFO)  
> **Category:** Validation Gap  
> **File:** `programs/tributary/src/policies/milestone.rs:23–26`  
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Description

```rust
require!(current_milestone < total_milestones, ...);
```

This allows `current_milestone = 2, total_milestones = 4`. The policy starts at milestone 2, skipping milestones 0 and 1. Their amounts are never claimable.

Self-inflicted only (owner signs creation). The skipped milestone amounts are effectively burned from the escrow authorization.

## Patch

```diff
-require!(current_milestone < total_milestones, ...);
+require!(current_milestone == 0, TributaryError::InvalidAmount);
```
