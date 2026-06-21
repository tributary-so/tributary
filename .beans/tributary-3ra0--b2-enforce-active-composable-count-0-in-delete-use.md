---
# tributary-3ra0
title: 'B2: Enforce active_composable_count == 0 in delete_user_payment'
status: completed
type: bug
priority: critical
created_at: 2026-06-21T18:16:43Z
updated_at: 2026-06-21T18:22:03Z
---

Fix the blocker reported in reports/B2-delete-user-payment-ignores-composable-count.md. delete_user_payment only checks active_policies_count == 0, ignoring active_composable_count, allowing dangling ComposablePolicy state after UserPayment close+recreate. Add HasActiveComposables error variant and a constraint check, plus a regression test.

## Plan

- [ ] RED: Add regression test in tests/composable.test.ts asserting delete_user_payment fails when active_composable_count > 0
- [ ] GREEN: Add HasActiveComposables variant to error.rs and constraint in delete_user_payment.rs
- [ ] Verify: cargo check + tsc compile
- [ ] Update report to mark Status: Fixed
- [x] Summary of Changes

## Summary of Changes

- `programs/tributary/src/error.rs`: Added `HasActiveComposables` error variant ("Cannot delete user payment with active composable policies").
- `programs/tributary/src/instructions/user/delete_user_payment.rs`: Added constraint `active_composable_count == 0 @ TributaryError::HasActiveComposables` to the `user_payment` account validation block, mirroring the existing `active_policies_count` guard.
- `tests/composable.test.ts`: New `describe` block "B2 regression" with two tests — (1) `delete_user_payment` fails while a composable policy is alive, (2) succeeds after that policy is deleted. Uses a dedicated `b2User` keypair to stay isolated from shared state.
- `reports/B2-delete-user-payment-ignores-composable-count.md`: Status flipped Open → Fixed (bean `tributary-3ra0`).

Verification: `cargo check` clean, `cargo fmt --check` clean, `tsc --noEmit` shows no errors in `tests/` or `programs/` (pre-existing unrelated errors remain in `packages/sdk-react` and `packages/sdk-x402`). Full `anchor test` (TS integration against a local validator) not executed in this environment.
