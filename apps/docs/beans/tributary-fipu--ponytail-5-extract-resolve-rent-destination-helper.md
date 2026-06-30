---
# tributary-fipu
title: "Ponytail #5: extract resolve_rent_destination helper"
status: completed
type: task
priority: normal
tags:
  - ponytail
  - dedup
created_at: 2026-06-24T12:38:21Z
updated_at: 2026-06-25T06:32:08Z
parent: tributary-9hca
---

Same 10-line rent-destination resolution block is copy-pasted across three delete handlers:

- `instructions/payment/delete_payment_policy.rs:55-65`
- `instructions/user/delete_user_payment.rs:39-49`
- `instructions/composable/delete_composable_policy.rs:48-58`

Each one does:

```rust
let destination = if stored_rent_payer == Pubkey::default() {
    owner.to_account_info()
} else {
    require!(rent_payer.key() == stored_rent_payer, InvalidRentPayer);
    rent_payer.to_account_info()
};
```

## Cut

- [x] Add to `shared/account_close.rs`:
  ```rust
  pub fn resolve_rent_destination<'info>(
      stored_rent_payer: Pubkey,
      owner: &AccountInfo<'info>,
      rent_payer: &AccountInfo<'info>,
  ) -> Result<AccountInfo<'info>> {
      if stored_rent_payer == Pubkey::default() {
          Ok(owner.clone())
      } else {
          require_keys_eq!(rent_payer.key(), stored_rent_payer, Tributary::InvalidRentPayer);
          Ok(rent_payer.clone())
      }
  }
  ```
- [x] Replace the three duplicated blocks with `let destination = resolve_rent_destination(stored_rent_payer, &owner_info, &rent_payer_info)?;`
- [x] Note: `rent_refund_target = destination.key()` is computed once after the call in each handler — leave that line in place (it's used by the event/msg).

## Verification

- `cargo test --lib` + `anchor test`
- Net delta: -30 LOC, +1 helper

## Files

- `programs/tributary/src/shared/account_close.rs` (add helper)
- `programs/tributary/src/instructions/payment/delete_payment_policy.rs` (call helper)
- `programs/tributary/src/instructions/user/delete_user_payment.rs` (call helper)
- `programs/tributary/src/instructions/composable/delete_composable_policy.rs` (call helper)

## Summary of Changes

- Added `resolve_rent_destination` helper to `shared/account_close.rs` (15 LOC including doc comment).
- Replaced the duplicated 10-line rent-destination resolution block in all three delete handlers:
  - `delete_payment_policy`
  - `delete_user_payment`
  - `delete_composable_policy`
- Switched the rent-payer key check from `require!(a == b, E)` to `require_keys_eq!(a, b, E)` for a clearer on-chain error (`Error#[code]` carries the intended key-mismatch semantics instead of a generic boolean require).
- `cargo check` clean; `cargo test --lib` reports `60 passed; 0 failed`.
- Net delta: ~-30 LOC duplicated across three sites → +1 helper (~15 LOC), so ~-15 LOC net across the three call sites.
