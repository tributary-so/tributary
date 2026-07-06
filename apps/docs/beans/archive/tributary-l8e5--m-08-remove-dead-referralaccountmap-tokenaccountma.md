---
# tributary-l8e5
title: 'M-08: Remove dead ReferralAccountMap / TokenAccountMap loaders'
status: completed
type: bug
priority: normal
created_at: 2026-06-19T10:25:03Z
updated_at: 2026-06-19T10:28:32Z
parent: tributary-4kt4
---

Reports/M-08 re-confirms M-05/M-06 still open: both state loaders still have silent-skip/break anti-patterns. Prior beans tributary-92e4 and tributary-scie were closed but their planned fixes never landed in code. Audit of call sites shows neither loader has any caller in programs/ or tests/ — the production path uses parse_and_validate_referral_accounts (utils.rs:463) which already validates size/writability/discriminator/topology/mint strictly. Remove both dead modules to eliminate the silent-failure liability.

## Plan

- [x] Confirm no callers (done: only self-references + state/mod.rs exports)
- [x] Delete programs/tributary/src/state/referral_account_map.rs
- [x] Delete programs/tributary/src/state/token_account_map.rs
- [x] Remove mod/use lines from programs/tributary/src/state/mod.rs
- [x] anchor build → verify compiles
- [x] anchor test → verify suite still green (89/89)
- [x] Update reports/M-08...md status to Resolved
- [x] Reopen note on prior beans tributary-scie / tributary-92e4 (closed without fix)

## Summary of Changes

M-08 resolved by deleting both dead-code loaders. Neither `ReferralAccountMap::load` nor `TokenAccountMap::load` had any caller in `programs/` or `tests/` — the real referral path uses `parse_and_validate_referral_accounts` (utils.rs:463) which is already strict (size/writability/discriminator/topology/mint/owner all explicit errors).

Removed:
- `programs/tributary/src/state/referral_account_map.rs`
- `programs/tributary/src/state/token_account_map.rs`
- two `pub mod` + two `pub use` lines in `programs/tributary/src/state/mod.rs`

Updated `reports/M-08-referral-token-account-map-silent-skip.md` → Status: Resolved (tributary-l8e5), with a Resolution section documenting why removal beat adding `load_strict` shims.

Verification: `anchor build` clean (only pre-existing warnings in execute_composable.rs); `anchor test` → 76/76 in tributary.test.ts and 13/13 in composable.test.ts (89 total, all green). No call sites needed migration.

Note on prior beans: tributary-scie (M-06) and tributary-92e4 (M-05) were marked completed but their planned code changes never landed in the tree. The audit epic tributary-4kt4 should be re-opened or have a follow-up to audit other completed children for the same paper-only closure pattern.
