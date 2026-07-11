# CF-014: `delete_payment_policy` Allows Deletion of Active Policies

> **Severity:** 🔵 3 (LOW)  
> **Category:** State Machine  
> **File:** `programs/tributary/src/instructions/payment/delete_payment_policy.rs:52–91`  
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Description

The handler performs no status check on the policy being deleted. An owner can delete an `Active` PaymentPolicy, closing the PDA and refunding rent. The delegate approval on the user's token account persists (it references the UserPayment PDA, not the policy PDA).

This is likely intentional (emergency cancellation), but the lack of a status check means a policy can be deleted while it has pending payments. The stale delegate approval remains until the user manually calls SPL Token `revoke`.

## Impact

No attacker-controlled exploit — only the owner can delete. The stale delegate is inert (no policy → no execution path). UX footgun only.

## Patch (optional hardening)

```diff
+// Optional: require Paused before delete to force a deliberate two-step process
+require!(
+    payment_policy.status != PolicyStatus::Active,
+    TributaryError::InvalidPolicyStatusTransition
+);
```

Or emit a log advising the caller to revoke the delegate:

```rust
msg!("Policy deleted. Call SPL Token revoke to clear the delegate on the user's token account.");
```
