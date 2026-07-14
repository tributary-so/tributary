---
# tributary-wxj4
title: 'CF-005: Composable Create missing next_payment_due / current_period_start sanitization'
status: completed
type: bug
priority: high
created_at: 2026-07-13T20:06:45Z
updated_at: 2026-07-13T20:34:01Z
parent: tributary-gq3x
---

# CF-005: Composable Create Missing `next_payment_due` / `current_period_start` Sanitization

> **Severity:** 🟡 6 (MEDIUM)
> **Category:** Logic / Compute-Budget DoS
> **Status:** Open
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Affected Code

**File:** `programs/tributary/src/instructions/composable/create_composable_policy.rs:200`

```rust
composable_policy.policy_type = policy_type;  // stored AS-IS, no sanitization
```

**Compare with `create_payment_policy.rs:90–123` (correct):**

```rust
let mut adjusted_policy_type = policy_type.clone();
match &mut adjusted_policy_type {
    PolicyType::Subscription { next_payment_due, .. } => {
        if *next_payment_due <= clock.unix_timestamp {
            *next_payment_due = clock.unix_timestamp;  // CLAMP to now
        }
    }
    PolicyType::PayAsYouGo { current_period_start, .. } => {
        *current_period_start = clock.unix_timestamp;  // FORCE to now
    }
    PolicyType::Milestone { milestone_timestamps, .. } => { /* ... */ },
    _ => {}
}
```

---

## Root Cause

The PaymentPolicy create path sanitizes user-supplied schedule fields before storing them. The ComposablePolicy create path skips this entirely. A `PolicyType::Subscription` with `next_payment_due = 0` (Unix epoch, Jan 1 1970) passes `validate_subscription_policy` (which never checks the value) and is stored as-is.

At first execution, `advance_policy` calls `calculate_next_payment_due(0, Monthly, ~1_700_000_000)`, which enters `skip_months`:

```rust
fn skip_months(current_due: i64, current_timestamp: i64, months: i32) -> Result<i64> {
    let mut next_due = current_due;  // = 0
    while next_due <= current_timestamp {  // 0 <= 1.7B → true
        next_due = add_months(next_due, months)?;  // +1 month from epoch
        iterations++;
    }
    // iterates ~650 times for Monthly (1970→2024 = ~650 months)
}
```

Each `add_months` call runs two inner O(year−1970) loops (~54 iterations each in 2024). Total: ~650 × 108 ≈ 70,200 BPF loop iterations. With each iteration performing multiple arithmetic operations, the compute budget (200K CU default, 1.4M max) is exhausted.

The transaction reverts. `next_payment_due` remains 0 (state mutation was rolled back). Every subsequent attempt hits the same wall. The policy is permanently bricked.

---

## Exploit Scenario

```
1. User creates composable policy with SDK bug (or manual construction):
   PolicyType::Subscription {
       amount: 1_000_000,
       next_payment_due: 0,          // ← epoch
       payment_frequency: Monthly,
       auto_renew: true,
       max_renewals: None,
       ...
   }

   validate_subscription_policy passes (doesn't check next_payment_due).
   create_composable_policy stores policy_type as-is.
   Policy PDA created, rent paid.

2. User (or gateway) calls execute_composable.

   Phase 0: byte-range checks pass
   Phase 1: pull from user → intermediate ✓
   Phase 1b: skim fees ✓
   Phase 2: pre-validation (if configured) ✓
   Phase 3: forward (if configured) ✓
   Phase 4: post-validation (if configured) ✓
   Phase 5: settle ✓
   advance_policy:
     calculate_next_payment_due(0, Monthly, 1_700_000_000)
     → skip_months: 650 iterations × O(year) loops
     → CU budget exhausted → TRANSACTION REVERTS

3. Everything rolls back. next_payment_due still 0.

4. Every future attempt fails identically. Policy is permanently stuck.
   User's delegated amount remains locked. No way to advance the schedule.
```

This is self-inflicted (the owner signs creation), but realistic: an SDK that defaults `next_payment_due` to 0, or a user who constructs the transaction incorrectly, silently bricks the policy. The PaymentPolicy path is immune due to the clamp; the composable path is not.

---

## Impact Assessment

| Dimension         | Value                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------- |
| **Fund loss**     | No theft, but delegated tokens are effectively locked (policy can't execute or advance) |
| **Preconditions** | Owner creates composable policy with `next_payment_due = 0` (or far in the past)        |
| **Recovery**      | Delete the policy (owner can call `delete_composable_policy`) and recreate              |
| **Scope**         | Only the misconfigured policy                                                           |

---

## Patch

Extract the sanitization block from `create_payment_policy.rs:90–123` into a shared helper and call it from both create paths:

```diff
// programs/tributary/src/shared/schedule.rs (or a new shared module)

+/// Sanitize user-supplied schedule fields before storing a policy.
+/// Clamps next_payment_due to now if in the past, forces
+/// current_period_start to now for PayAsYouGo.
+pub fn sanitize_policy_for_creation(
+    policy_type: &mut PolicyType,
+    current_timestamp: i64,
+) {
+    match policy_type {
+        PolicyType::Subscription { next_payment_due, .. } => {
+            if *next_payment_due <= current_timestamp {
+                *next_payment_due = current_timestamp;
+            }
+        }
+        PolicyType::PayAsYouGo { current_period_start, .. } => {
+            *current_period_start = current_timestamp;
+        }
+        PolicyType::Milestone { milestone_timestamps, total_milestones, .. } => {
+            let n = *total_milestones as usize;
+            for ts in milestone_timestamps.iter_mut().take(n) {
+                if *ts <= current_timestamp {
+                    *ts = current_timestamp;
+                }
+            }
+        }
+        _ => {}
+    }
+}
```

```diff
// programs/tributary/src/instructions/payment/create_payment_policy.rs
-// Replace inline sanitization block (lines 90-123) with:
+sanitize_policy_for_creation(&mut adjusted_policy_type, clock.unix_timestamp);
```

```diff
// programs/tributary/src/instructions/composable/create_composable_policy.rs

 let clock = Clock::get()?;
+crate::shared::schedule::sanitize_policy_for_creation(&mut policy_type, clock.unix_timestamp);
 composable_policy.policy_type = policy_type;
```

---

## Verification

```rust
#[test]
fn composable_subscription_clamps_past_due_date() {
    let mut pt = PolicyType::Subscription {
        amount: 1000,
        next_payment_due: 0,  // epoch
        payment_frequency: PaymentFrequency::Monthly,
        auto_renew: true,
        max_renewals: None,
        padding: [0; 97],
    };
    sanitize_policy_for_creation(&mut pt, 1_700_000_000);
    match pt {
        PolicyType::Subscription { next_payment_due, .. } => {
            assert_eq!(next_payment_due, 1_700_000_000, "must be clamped to now");
        }
        _ => panic!(),
    }
}
```

After the fix, creating a composable subscription with `next_payment_due = 0` stores `next_payment_due = now`. The first execution's `advance_policy` only advances one month forward (O(1) effectively), staying well within the compute budget.

## Summary of Changes

CF-005 fixed by extracting the create-time schedule sanitization into a shared helper and applying it to BOTH create paths:

- **shared/schedule.rs**: Added `sanitize_policy_for_creation(&mut PolicyType, i64)` — clamps `Subscription.next_payment_due` to now if in the past, forces `PayAsYouGo.current_period_start` to now. `Milestone`, `OneTime`, `UpTo` are no-ops (matching existing PaymentPolicy behavior — milestone timestamp validation is CF-019/CF-020/CF-015 scope, OneTime/UpTo are execute-time gated).
- **create_payment_policy.rs**: Replaced the inline 34-line match block with a call to the shared helper. Pure refactor — behavior identical. Updated qedgen hash (1b52a4a7fb1a17dd → 146d0ad59fd1f963).
- **create_composable_policy.rs**: Added the sanitization call before storing `policy_type` (the actual fix — this path previously stored user-supplied values as-is).

Added 5 unit tests in `shared/schedule::tests` covering all PolicyType variants.

All 188 lib tests pass, 0 failures. No new clippy warnings.
