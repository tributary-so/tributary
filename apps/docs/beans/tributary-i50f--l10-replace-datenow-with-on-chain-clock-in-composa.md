---
# tributary-i50f
title: 'L10: Replace Date.now() with on-chain clock in composable tests'
status: completed
type: task
priority: low
created_at: 2026-06-21T19:42:25Z
updated_at: 2026-06-21T19:49:13Z
---

Audit finding L10 (LOW, test flakiness). tests/composable.test.ts uses Math.floor(Date.now()/1000) at 11+ sites to derive next_payment_due, which is compared on-chain against Clock::get(). Test runner clock can drift from validator clock, especially under CI load or when using Surfpool (which fast-forwards). Add a tests/helpers/onChainNow.ts helper and migrate all sites to read the on-chain block time.

## Todos
- [x] Create tests/helpers/onChainNow.ts helper
- [x] Import and use it at every Date.now() site in composable.test.ts — 15 sites migrated
- [x] Verify tsc / lint / prettier passes
- [ ] Stage source + bean files (NOT reports/), commit

## Summary of Changes

- Added tests/helpers/onChainNow.ts that reads block time via connection.getSlot() + getBlockTime().
- Migrated 15 Date.now() sites in tests/composable.test.ts to await getOnChainNow(connection).
- Tests now derive next_payment_due / pastTime from the same clock the program uses.
- Verified with tsc --noEmit and prettier.

Bean complete.
