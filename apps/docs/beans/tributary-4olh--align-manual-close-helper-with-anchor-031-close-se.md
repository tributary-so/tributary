---
# tributary-4olh
title: Align manual close helper with Anchor 0.31 close= semantics
status: completed
type: task
priority: high
created_at: 2026-06-23T12:04:03Z
updated_at: 2026-06-23T12:11:28Z
---

Refactor shared/account_close.rs (used by delete_payment_policy.rs and delete_user_payment.rs) to use Anchor's assign+realloc close routine instead of the legacy 0xFF discriminator approach.

## Summary of Changes

- Rewrote `shared/account_close.rs::close_account` to mirror Anchor 0.31's `close=` routine byte-for-behaviour: drain lamports (checked add) → zero source lamports → `info.assign(&system_program::ID)` → `info.realloc(0, false)`.
- Dropped the legacy `CLOSE_DISCRIMINATOR` (0xFF) approach — superseded by assign+realloc in modern Anchor; the constant was only referenced inside the helper.
- Kept the framework-level safety guards (`require_keys_neq`, destination must be System-owned + writable) since these replicate what Anchor's `close =` constraint validates and we bypass the constraint by choosing the destination at runtime (stored `rent_payer` field).
- Added `is_closed` helper mirroring `anchor_lang::common::is_closed`.
- Call sites unchanged (signature preserved): `delete_payment_policy.rs`, `delete_user_payment.rs`, and `delete_composable_policy.rs` all pick up the new behaviour.

## Verification
- `cargo check -p tributary`: clean, no warnings.
- `cargo clippy -p tributary --all-targets`: 0 errors (23 pre-existing warnings, none in touched file).
- `anchor test`: 93/93 pass, incl. delete-policy / delete-user-payment / delete-composable rent-return cases.
