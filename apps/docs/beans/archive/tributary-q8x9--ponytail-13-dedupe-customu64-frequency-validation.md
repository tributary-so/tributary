---
# tributary-q8x9
title: "Ponytail #13: dedupe Custom(u64) frequency validation (triple-checked)"
status: completed
type: task
priority: low
tags:
  - ponytail
  - dedup
created_at: 2026-06-24T12:39:51Z
updated_at: 2026-06-25T06:53:22Z
parent: tributary-9hca
---

`PaymentFrequency::Custom(u64)` is validated in three places:

1. `state/payment_policy.rs:41-49` (`PaymentFrequency::validate`) — checks `*interval > 0` only
2. `policies/subscription.rs:19` (`validate_subscription_policy`) — calls `payment_frequency.validate()`
3. `shared/schedule.rs:45-52` (`calculate_next_payment_due::Custom` arm) — checks `*interval_seconds > 0` AND `*interval_seconds <= i64::MAX as u64` (the cast-to-i64 boundary that actually matters)

The upstream checks (#1, #2) don't catch the i64::MAX overflow — only #3 does, because that's where the `as i64` cast lives. So #1 and #2 give a false sense of validation: they reject `0` but accept `u64::MAX`, which then trips #3 at execution time.

## Cut

- [ ] Keep the validation only in `calculate_next_payment_due` (the boundary that needs it).
- [ ] Delete `PaymentFrequency::validate` entirely (it has one caller — `validate_subscription_policy` — which can drop the call).
- [ ] Update `validate_subscription_policy` to not call `payment_frequency.validate()`.
- [ ] Verify: if a policy is created with `Custom(0)`, the create succeeds but the first execution fails with `InvalidFrequency`. **Trade-off:** fail-late vs fail-early. Ponytail prefers fail-early — so the better move is: keep ONE validation at create-time (in `validate_subscription_policy`) that mirrors #3's full check (both `> 0` and `<= i64::MAX`), and drop #3's duplicate (or keep #3 as defense-in-depth — see below).

## Preferred resolution

- [x] Move the full check (`> 0 && <= i64::MAX as u64`) into `validate_subscription_policy` so create-time rejects bad intervals.
- [x] Keep `calculate_next_payment_due`'s check as defense-in-depth (it is documented as the boundary).
- [x] Delete `PaymentFrequency::validate`.

## Verification

`cargo test --lib` — add a test that `Custom(0)` and `Custom(u64::MAX)` are both rejected at create-time.

## Files

- `programs/tributary/src/state/payment_policy.rs:39-50` (delete `validate`)
- `programs/tributary/src/policies/subscription.rs:19` (inline the full check)
- `programs/tributary/src/shared/schedule.rs:45-52` (keep as defense-in-depth)

## Summary of Changes

- Deleted `PaymentFrequency::validate` (state/payment_policy.rs) — had a single caller.
- Inlined the full check (`> 0` AND `<= i64::MAX as u64`) into `validate_subscription_policy` (policies/subscription.rs); the `<= i64::MAX` boundary was previously only enforced at execute-time in `calculate_next_payment_due`.
- Kept `calculate_next_payment_due`'s `Custom`-arm check in shared/schedule.rs unchanged as documented defense-in-depth at the cast site.
- Added 4 regression tests: `Custom(0)` → `Err(InvalidFrequency)`, `Custom(u64::MAX)` → `Err(InvalidFrequency)`, `Custom(86400)` → `Ok(())`, and `Monthly` → `Ok(())` (non-Custom variants skip the interval check).
- `cargo check` clean; `cargo test --lib` **64 passed** (60 existing + 4 new).
- Closes the fail-late gap: bad `Custom(u64)` intervals are now rejected at policy-create time rather than surfacing only on the first `execute_payment` call.
