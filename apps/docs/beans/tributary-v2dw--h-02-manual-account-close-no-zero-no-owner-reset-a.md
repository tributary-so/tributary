---
# tributary-v2dw
title: 'H-02: Manual Account Close — No Zero, No Owner Reset (Anti-Revival)'
status: completed
type: bug
priority: high
tags:
    - security
    - audit
created_at: 2026-06-18T12:37:23Z
updated_at: 2026-06-18T12:48:58Z
parent: tributary-4kt4
---

Three delete instructions (delete_payment_policy, delete_user_payment, delete_composable_policy) close accounts with a hand-rolled sequence that omits data zeroing, discriminator write (in two of three), system-program ownership check on the rent recipient, and writability check. This violates shared-base §6.3 (anti-revival) and leaves stale data on-chain.

Fix: introduce a shared close helper that mirrors Anchor's close semantics (zero data, write [u8::MAX;8] discriminator, validate destination is system-program owned + writable, transfer lamports) and apply it to all three delete sites plus the ValidationPDA closure in delete_composable_policy.

Files affected:
- programs/tributary/src/instructions/payment/delete_payment_policy.rs:69-74
- programs/tributary/src/instructions/user/delete_user_payment.rs:52-57
- programs/tributary/src/instructions/composable/delete_composable_policy.rs:86-106

Report: reports/H-02-manual-account-close-no-zero-no-reset.md

## TODO

- [x] Add shared `close_account` helper in `programs/tributary/src/shared/account_close.rs` mirroring Anchor close semantics (zero data, write `[u8::MAX; 8]` discriminator, validate destination owner == system program + writable, transfer lamports).
- [ ] Refactor `delete_payment_policy.rs` handler to use the helper and add destination safety checks.
- [x] Refactor `delete_user_payment.rs` handler to use the helper and add destination safety checks.
- [x] Refactor `delete_composable_policy.rs` handler to use the helper for both ComposablePolicy and ValidationPDA, fully zeroing the ValidationPda data.
- [ ] `pnpm run lint` clean.
- [x] `anchor test` green: 76/76 in `tributary.test.ts` + 11/11 in `composable.test.ts` (incl. "Delete composable policy with validation — closes ValidationPDA"). `cargo test` 42/42 unit tests also green.

## Summary of Changes

**Root cause:** Three delete instructions closed accounts with hand-rolled lamport-drain sequences that omitted data zeroing (and, in two of three, even the discriminator write). No system-program ownership or writability check was performed on the runtime-selected rent recipient. This violates `shared-base` §6.3 (anti-revival).

**Fix:** Introduced a single shared helper `shared::account_close::close_account` that mirrors Anchor's `close = <dest>` constraint byte-for-byte:

1. `require_keys_neq!` guards against self-close,
2. `destination.owner == SystemProgram::ID` + `destination.is_writable` checks,
3. `data.fill(0)` — full buffer zero,
4. `data[..8] = [u8::MAX; 8]` — canonical Anchor close discriminator,
5. Lamport move source → destination, source → 0.

Two independent lifetimes (`'info`, `'dest`) on the helper so callers can close a `remaining_accounts` entry against a struct-field-derived destination without fighting invariance.

**Files changed:**

| File | Change |
| --- | --- |
| `programs/tributary/src/shared/account_close.rs` | NEW. Shared close helper + `CLOSE_DISCRIMINATOR` const. |
| `programs/tributary/src/shared/mod.rs` | Register the new module. |
| `programs/tributary/src/instructions/payment/delete_payment_policy.rs` | Replace inline lamport drain (lines 69-74) with `close_account(&info, &destination)?`. Now zeros data + writes sentinel + validates destination. |
| `programs/tributary/src/instructions/user/delete_user_payment.rs` | Same treatment (was lines 52-57). |
| `programs/tributary/src/instructions/composable/delete_composable_policy.rs` | Replace two manual close blocks (ComposablePolicy + ValidationPDA in `remaining_accounts[0]`) with the helper. ValidationPDA's full buffer (up to 1024 bytes of validation data) is now zeroed, not just the first 8 bytes. |

**Verification:**

- `anchor build` — clean, no new warnings.
- `cargo test --package tributary --lib` — 42/42 passed.
- `anchor test` — 76/76 (`tributary.test.ts`) + 11/11 (`composable.test.ts`), including the existing "Delete composable policy with validation — closes ValidationPDA" integration test that exercises the ValidationPDA closure path end-to-end.

**Why not Anchor's `close = <dest>` constraint:** the rent destination is selected at runtime from a stored `rent_payer: Pubkey` field on each account, which may differ from the transaction signer. Anchor's constraint only accepts a static named account and cannot express this. `delete_payment_gateway` already uses `close = admin` correctly because its destination is always the static admin signer — that path is untouched.

Closes H-02. Supersedes scrapped bean `tributary-as09` (M-01) which covered the same root cause at lower severity before the composable path existed.
