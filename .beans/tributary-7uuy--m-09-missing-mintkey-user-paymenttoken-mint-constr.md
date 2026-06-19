---
# tributary-7uuy
title: 'M-09: Missing mint.key() == user_payment.token_mint constraint'
status: completed
type: bug
priority: normal
created_at: 2026-06-19T09:57:39Z
updated_at: 2026-06-19T10:03:51Z
parent: tributary-4kt4
---

## Problem

The `mint` account in `execute_payment.rs` (line 75-76) and `execute_composable.rs` (line 462-465) lacks an explicit Anchor constraint binding it to `user_payment.token_mint`.

In `execute_payment.rs`:
```rust
#[account()]
pub mint: Box<InterfaceAccount<'info, Mint>>,
```

In `execute_composable.rs`:
```rust
#[account(
    constraint = mint.key() == composable_policy.forward_config.input_mint,
)]
pub mint: Box<InterfaceAccount<'info, Mint>>,
```

Runtime CPI catches the mismatch via `transfer_checked`, but there is no fail-fast constraint at the Anchor layer.

## Fix

Add explicit constraints binding `mint.key() == user_payment.token_mint @ TributaryError::TokenMintMismatch`.

## Tasks

- [x] Add constraint to `execute_payment.rs` `mint` account
- [x] Add constraint to `execute_composable.rs` `mint` account
- [x] Run `anchor test` to verify
- [x] Update report status to Resolved

## Summary of Changes

- Added explicit Anchor constraint `mint.key() == user_payment.token_mint @ TributaryError::TokenMintMismatch` to `programs/tributary/src/instructions/payment/execute_payment.rs` (the `mint` account was previously declared as bare `#[account()]`).
- Added the same constraint to `programs/tributary/src/instructions/composable/execute_composable.rs` `mint` account, which previously only bound against `composable_policy.forward_config.input_mint`.
- Updated `reports/M-09-missing-mint-user-payment-constraint.md` status to Resolved with a Resolution section.
- Verified via `anchor test` — 89/89 tests pass (76 tributary + 13 composable).
