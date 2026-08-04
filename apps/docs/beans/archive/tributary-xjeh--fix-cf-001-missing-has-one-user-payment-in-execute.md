---
# tributary-xjeh
title: 'Fix CF-001: Missing has_one = user_payment in execute_payment — cross-account token drain'
status: completed
type: bug
priority: critical
created_at: 2026-07-11T17:29:25Z
updated_at: 2026-07-11T17:33:25Z
---

## CF-001: Self-referential PDA seed in execute_payment allows cross-account token drain

**Severity:** 10 (CRITICAL — blocks deploy)

The `payment_policy` account in `ExecutePayment` uses self-referential PDA seeds (`payment_policy.user_payment.as_ref()` — from the account's own data) instead of the context account's runtime key (`user_payment.key().as_ref()`). Every sibling instruction (change_payment_policy_status, delete_payment_policy) correctly uses the context account key.

This allows an attacker to execute their own PaymentPolicy against a victim's UserPayment, draining the victim's tokens.

### Fix
Change PDA seeds from `payment_policy.user_payment.as_ref()` to `user_payment.key().as_ref()` to match the sibling instructions' pattern.

### Acceptance Criteria
- [x] PDA seeds in execute_payment use `user_payment.key().as_ref()`
- [x] `anchor build` succeeds
- [x] `cargo test` passes (170 unit + 21 proptests)
- [x] Existing integration tests still pass

## Summary of Changes

Fixed CF-001 (Sev 10 CRITICAL): changed the self-referential PDA seed in `execute_payment.rs:37` from `payment_policy.user_payment.as_ref()` (account's own data) to `user_payment.key().as_ref()` (context account's runtime key), matching the pattern already used by `change_payment_policy_status.rs:24` and `delete_payment_policy.rs:30`.

This closes the cross-account token drain vector where an attacker could execute their own PaymentPolicy against a victim's UserPayment.

```diff
- seeds = [PAYMENT_POLICY_SEED, payment_policy.user_payment.as_ref(), ...],
+ seeds = [PAYMENT_POLICY_SEED, user_payment.key().as_ref(), ...],
```
