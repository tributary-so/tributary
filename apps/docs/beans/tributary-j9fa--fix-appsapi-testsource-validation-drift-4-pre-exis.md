---
# tributary-j9fa
title: Fix apps/api test/source validation drift (4 pre-existing failing tests)
status: todo
type: bug
priority: normal
created_at: 2026-07-07T07:02:21Z
updated_at: 2026-07-07T07:02:21Z
---

Surfaced by tributary-or5g verification. 4 jest tests fail identically on clean tree and after lint cleanup — confirmed pre-existing, not a regression. The source validation logic has drifted from what the tests assert.

Failing tests (apps/api/src/__tests__):
- tokens.route.test.ts: 'should return 400 when walletPublicKey missing and no trackingId+recipient' — expects 400, gets 200 (empty payload accepted)
- tokens.route.test.ts: 'should return 400 when walletPublicKey missing with only trackingId' — expects 400, gets 200
- subscription.route.test.ts: 'should reject walletPublicKey without tokenMint' — expects error 'walletPublicKey or tokenMint', source returns 'If you provide walletPublicKey you also have to provide tokenMint!'
- subscription.route.test.ts: 'should reject tokenMint without walletPublicKey' — expects 400, gets 404

## Acceptance
- [ ] Investigate each failure: is the SOURCE wrong (validation gap) or the TEST wrong (stale expectation)?
- [ ] tokens.route: decide whether empty/trackId-only payloads should be 400 (likely yes) and fix source OR adjust test
- [ ] subscription.route: reconcile error message text + ensure 400 (not 404) for missing-pair cases
- [ ] All 4 tests pass; no other tests regress
- [ ] `pnpm --filter @tributary-so/api test` green (15 suites, 0 failures)
