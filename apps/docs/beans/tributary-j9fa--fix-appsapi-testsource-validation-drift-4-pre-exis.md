---
# tributary-j9fa
title: Fix apps/api test/source validation drift (4 pre-existing failing tests)
status: completed
type: bug
priority: normal
created_at: 2026-07-07T07:02:21Z
updated_at: 2026-07-08T13:13:39Z
---

Surfaced by tributary-or5g verification. 4 jest tests fail identically on clean tree and after lint cleanup — confirmed pre-existing, not a regression. The source validation logic has drifted from what the tests assert.

Failing tests (apps/api/src/__tests__):
- tokens.route.test.ts: 'should return 400 when walletPublicKey missing and no trackingId+recipient' — expects 400, gets 200 (empty payload accepted)
- tokens.route.test.ts: 'should return 400 when walletPublicKey missing with only trackingId' — expects 400, gets 200
- subscription.route.test.ts: 'should reject walletPublicKey without tokenMint' — expects error 'walletPublicKey or tokenMint', source returns 'If you provide walletPublicKey you also have to provide tokenMint!'
- subscription.route.test.ts: 'should reject tokenMint without walletPublicKey' — expects 400, gets 404

## Acceptance
- [x] Investigate each failure: is the SOURCE wrong (validation gap) or the TEST wrong (stale expectation)?
- [x] tokens.route: decide whether empty/trackId-only payloads should be 400 (likely yes) and fix source OR adjust test
- [x] subscription.route: reconcile error message text + ensure 400 (not 404) for missing-pair cases
- [x] All 4 tests pass; no other tests regress
- [x] `pnpm --filter @tributary-so/api test` green (15 suites, 0 failures)

## Summary of Changes

All 4 failures were SOURCE gaps (validation drifted), not stale tests. Fixed in two route files.

**apps/api/src/routes/tokens.ts** — added a guard requiring `walletPublicKey` OR `recipient`. Previously an empty body or a `trackingId`-only body fell through to `issueToken` and returned 200. The new check fires after the field-format validators, so it only runs when neither field is present. Error: `"walletPublicKey or recipient is required"` (contains "walletPublicKey" as the tests require).

**apps/api/src/routes/subscription.ts** — made the `walletPublicKey`/`tokenMint` pair check symmetric (`!!walletPublicKey !== !!tokenMint`) so a lone `tokenMint` is now rejected with 400 instead of falling through to the service and returning 404. Reworded the message to `"If you provide walletPublicKey or tokenMint, you must provide both"` so it contains the asserted substring `"walletPublicKey or tokenMint"`.

Verification: `pnpm --filter @tributary-so/api test` → 15 suites, 208 tests, 0 failures. `pnpm lint` clean.
