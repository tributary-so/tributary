---
# tributary-szh4
title: 'M2: Extract try_distribute_referral_rewards helper to shared/referral.rs'
status: completed
type: task
priority: normal
created_at: 2026-06-22T12:27:37Z
updated_at: 2026-06-22T12:34:25Z
---

execute_payment.rs and transfer.rs duplicate ~30 lines of ReferralContext plumbing with only one meaningful difference (payment_policy_key: real key vs Pubkey::default() sentinel). Extract try_distribute_referral_rewards() helper into shared/referral.rs (now exists after M1) and refactor both call sites to use it.

Report: reports/M2-duplicated-referral-context-plumbing.md

## Summary of Changes

- Added `try_distribute_referral_rewards` helper to `shared/referral.rs` (~50 lines incl. doc comment).
- Refactored `execute_payment.rs` and `transfer.rs` call sites to use the helper, eliminating ~30 lines of duplicated ReferralContext plumbing.
- `transfer.rs` still passes `Pubkey::default()` sentinel for `payment_policy_key` (L2 leak preserved per scope — separate finding).
- Pure refactor; `cargo test -p tributary --lib` reports 51 passed / 0 failed.
- `reports/` and `target/` untouched.
