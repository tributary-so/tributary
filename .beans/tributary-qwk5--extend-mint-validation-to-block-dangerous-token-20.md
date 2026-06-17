---
# tributary-qwk5
title: Extend mint validation to block dangerous Token-2022 extensions
status: completed
type: task
priority: high
created_at: 2026-06-14T12:03:24Z
updated_at: 2026-06-14T12:05:54Z
---

Extend validate_mint_no_transfer_hook to reject: ConfidentialTransfer, NonTransferable, PermanentDelegate, TransferHook, TransferFee, MintCloseAuthority. Note: Pausable does not exist in spl-token-2022 6.0.0.

- [ ] Add error variants for each unsupported extension
- [ ] Add extension imports to utils.rs
- [ ] Extend validator function and rename to validate_mint_compatible
- [ ] Update call site in create_user_payment.rs
- [x] Build to verify compilation

## Summary of Changes

- Renamed `validate_mint_no_transfer_hook` → `validate_mint_compatible` (old name no longer reflected behavior).
- Added 5 new error variants in `error.rs`: ConfidentialTransferNotSupported, NonTransferableNotSupported, PermanentDelegateNotSupported, TransferFeeNotSupported, MintCloseAuthorityNotSupported.
- Validator now rejects 6 Token-2022 mint extensions: TransferHook, ConfidentialTransferMint, NonTransferable, PermanentDelegate, TransferFeeConfig, MintCloseAuthority.
- Updated call site in `create_user_payment.rs`.
- Build + clippy pass (no new warnings).

## Note on Pausable

`Pausable` does **not exist** in spl-token-2022 6.0.0 (the crate pinned in Cargo.lock). Skipped intentionally. If a different token program / extension is meant, please clarify.
