---
# tributary-qmns
title: 'M5: Check min_output_amount against net (post-fee) sweep_amount'
status: completed
type: task
priority: normal
created_at: 2026-06-22T12:51:16Z
updated_at: 2026-06-22T12:55:31Z
---

execute_composable.rs checks min_output_amount against gross output before fee deduction — surprising semantics that violate DeFi convention (Uniswap/Jupiter use net amountOutMin). Since forward CPI is currently commented out (B1), this check has no observable behavior yet — perfect time to fix it before it ships.

Going with Option A from the report: move the require! check to after fees are calculated, comparing against sweep_amount (the net the recipient actually receives).

Report: reports/M5-min-output-amount-checked-before-fees.md

## Summary of Changes

- Moved `min_output_amount` check in `execute_composable.rs` from BEFORE fees to AFTER `sweep_amount` is computed (now checks net, not gross).
- Added doc comment on `ForwardConfig.min_output_amount` in `composable_policy.rs` documenting net-after-fees semantics, matching DeFi convention (Uniswap/Jupiter amountOutMin).
- Added pointer comment at the old site explaining the relocation.
- Updated `CHANGELOG.md` under [Unreleased] → Changed.

Going with Option A (behavior fix) — safe because forward CPI is currently commented out (B1), so the check has no observable runtime effect today; lands ahead of forward-CPI enablement so integrators can rely on net semantics from day one.

`cargo test -p tributary --lib`: 51 passed / 0 failed. `reports/` untouched.
