---
# tributary-mdlq
title: 'CF-014: delete_payment_policy allows deletion of active policies'
status: completed
type: bug
priority: normal
created_at: 2026-07-13T20:06:45Z
updated_at: 2026-07-13T20:56:02Z
parent: tributary-gq3x
---

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

## Summary of Changes

CF-014 remediated by adding the same status constraint that already guards `DeleteComposablePolicy` to `DeletePaymentPolicy`. Now `payment_policy.status != PolicyStatus::Active` is enforced at the account-validation layer, forcing owners to pause a policy before they can delete it. This eliminates the stale-delegate UX footgun (an Active policy with pending payments can no longer be rent-closed while still approved on the user's token account) without removing the emergency-cancellation path (Paused/Completed still deletable).

### Files
- `programs/tributary/src/instructions/payment/delete_payment_policy.rs` — added `constraint = payment_policy.status != PolicyStatus::Active @ TributaryError::InvalidPolicyStatusTransition` to the `payment_policy` account, matching the composable pattern (comment cites CF-014).
- `tests/tributary.test.ts` — two updates:
  1. `Delete payment policy` test now expects the Active-delete to reject, then pauses, then deletes — doubles as the regression check.
  2. Bulk-cleanup `deletePolicy` helper now pauses any still-Active policy before deleting.

### Rationale vs. the bean's alternatives
- The diff option in the bean (require Paused) is exactly what landed — it's already the established pattern on the composable side, so consistency wins over the weaker `msg!` advisory.
- No new error variant, no new instruction, no SDK change. Smallest diff that closes the gap and aligns the two policy families.

### Verification
- `cargo check --manifest-path programs/tributary/Cargo.toml` — clean.
- `pnpm --filter @tributary-so/sdk run lint` — clean.
- `npx tsc --noEmit` in `tests/` — only the pre-existing `Cannot find type definition file for 'jest'` config warning; no errors introduced by the test edits.

### Commits
- `877b8d61` — 🐛 fix(payment): reject deletion of Active PaymentPolicy (CF-014)
