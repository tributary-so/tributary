---
# tributary-aon7
title: 'CF-021: create_payment_policy uses saturating_add for policy ID'
status: todo
type: bug
priority: low
created_at: 2026-07-13T20:06:45Z
updated_at: 2026-07-13T20:06:45Z
parent: tributary-gq3x
---

# CF-021: `create_payment_policy` Uses `saturating_add` for Policy ID

> **Severity:** ⚪ 2 (INFO)
> **Category:** Arithmetic
> **File:** `programs/tributary/src/instructions/payment/create_payment_policy.rs:136`
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Description

```rust
let policy_id = user_payment.created_policies_count.saturating_add(1);
```

If `created_policies_count` reaches `u32::MAX`, `saturating_add(1)` returns `u32::MAX`. The next policy would collide with the previous ID at that number. Anchor's `init` fails with "already in use" — caught, but the error is confusing.

Practically unreachable (requires ~4 billion policies at ~0.01 SOL rent each ≈ 40M SOL). The `max_policies_per_user` enforcement is commented out ("DEPRECATED").

## Patch

```diff
-let policy_id = user_payment.created_policies_count.saturating_add(1);
+let policy_id = user_payment.created_policies_count
+    .checked_add(1)
+    .ok_or(TributaryError::ArithmeticOverflow)?;
```
