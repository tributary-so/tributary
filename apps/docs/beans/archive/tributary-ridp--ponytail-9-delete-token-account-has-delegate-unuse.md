---
# tributary-ridp
title: "Ponytail #9: delete token_account_has_delegate (unused single-key helper)"
status: completed
type: task
priority: high
tags:
  - ponytail
  - dead-code
created_at: 2026-06-24T12:38:55Z
updated_at: 2026-06-25T06:10:52Z
parent: tributary-9hca
---

`shared/delegation.rs:12-17` defines `token_account_has_delegate(delegate, expected_delegate)` — a single-key variant of `token_account_has_any_delegate` (line 23).

`grep -r token_account_has_delegate[^_] programs/tributary/src` returns only the definition. All call sites (`execute_payment.rs:69`, `execute_composable.rs:576`) use the `_any_` variant because they need to accept either the v1 UserPayment PDA or the v0 global payments_delegate PDA.

## Cut

- [x] Delete lines 12-17 of `shared/delegation.rs` (the `token_account_has_delegate` fn + its doc comment)
- [x] `cargo check` clean; `cargo test --lib` 60/0

## Verification

Build must pass.

## Files

- `programs/tributary/src/shared/delegation.rs:10-17` (delete the fn + its doc comment)

## Summary of Changes

- `token_account_has_delegate` (single-key variant) deleted from `shared/delegation.rs:10-17`
- `cargo check` clean; `cargo test --lib` 60/0
- No behavior change — all call sites use `token_account_has_any_delegate`
