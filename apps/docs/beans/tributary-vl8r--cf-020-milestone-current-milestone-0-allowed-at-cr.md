---
# tributary-vl8r
title: 'CF-020: Milestone current_milestone > 0 allowed at creation'
status: completed
type: bug
priority: low
created_at: 2026-07-13T20:06:45Z
updated_at: 2026-07-14T06:30:30Z
parent: tributary-gq3x
---

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

## Summary of Changes

CF-020 fixed in `programs/tributary/src/policies/milestone.rs` (`validate_milestone_policy`):

- Replaced `require!(current_milestone < total_milestones, ...)` with `require!(current_milestone == 0, ...)`. A fresh policy must start at milestone 0; the old check allowed e.g. current=2/total=4, permanently skipping (and burning the escrow for) milestones 0 and 1.
- Added regression test `rejects_nonzero_current_milestone_at_creation`.

All 11 `policies::milestone::tests` pass.
