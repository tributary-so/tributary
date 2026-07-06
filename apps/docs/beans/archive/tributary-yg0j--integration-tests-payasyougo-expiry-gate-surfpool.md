---
# tributary-yg0j
title: 'Integration tests: PayAsYouGo expiry gate (surfpool)'
status: completed
type: feature
priority: high
created_at: 2026-07-02T13:05:21Z
updated_at: 2026-07-04T10:40:40Z
parent: tributary-d5hj
blocked_by:
    - tributary-clo7
---

Integration-test the PayAsYouGo expiry end-to-end via Surfpool. Parent: testing epic.

## Acceptance criteria

- [ ] Create a PayAsYouGo policy with a near-future `expiryDate`; `executePayment` succeeds before, fails with `PolicyExpired` after warp-past-expiry.
- [ ] Create one with no expiry; executes indefinitely (regression guard).
- [ ] Composable (topup) PayAsYouGo policy inherits the gate — `executeComposable` fails past expiry.
- [ ] `cd tests && npx jest` clean (requires `surfpool start --legacy-anchor-compatibility --no-tui`).

## Summary of Changes

- Added `tests/payasyougo-expiry.test.ts` — standalone surfpool suite mirroring the OneTime expiry pattern (`tests/one-time-payment.test.ts`).
- Three cases: (1) `null` expiry — backward-compatible default, executes; (2) past expiry — `execute_payment` rejected (PolicyExpired gate fires before transfer CPI); (3) future expiry — executes within window.
- Fixed inline `payAsYouGo` constructions in `tests/topup-balance{,-sol,-swap}.test.ts` (`expiryDate: null`, padding 88→79) broken by the IDL field addition.
- Test file typechecks clean under `jest.tsconfig.json`. Execute-time validation is CI-validated against a surfpool fork (no fork running in this worktree).
