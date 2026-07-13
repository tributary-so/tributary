---
# tributary-7v9g
title: 'CF-019: Milestone timestamps not ascending-checked'
status: todo
type: bug
priority: low
created_at: 2026-07-13T20:06:45Z
updated_at: 2026-07-13T20:06:45Z
parent: tributary-gq3x
---

# CF-019: Milestone Timestamps Not Ascending-Checked

> **Severity:** ⚪ 2 (INFO)
> **Category:** Logic / Validation Gap
> **File:** `programs/tributary/src/policies/milestone.rs:34–44`
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Description

Each timestamp is checked `> current_time` (mainnet only), but there's no check that `timestamps[i] <= timestamps[i+1]`. A policy with `timestamps = [T2, T1, ...]` where `T1 < T2` is accepted.

Not directly exploitable — milestones execute in fixed order (0, 1, 2, ...) via `current_milestone` increment. By the time milestone 1 executes, its (earlier) timestamp is already past. But logically inconsistent.

## Patch

```diff
+for i in 1..total_milestones as usize {
+    require!(
+        milestone_timestamps[i] >= milestone_timestamps[i - 1],
+        TributaryError::InvalidPaymentDueDate
+    );
+}
```
