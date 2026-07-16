---
# tributary-ztee
title: Integration tests for new endpoints
status: completed
type: task
created_at: 2026-07-16T10:23:50Z
updated_at: 2026-07-16T12:00:00Z
parent: tributary-xh0f
---

Write integration tests in apps/api/src/**tests**/ for: GET /payment-policies (filter combos), GET /payment-policies/:address, GET /payment-policies/:address/executions, GET /composable-policies (filter combos), GET /composable-policies/:address, GET /composable-policies/:address/executions. Test 400 cases (no filters, >3 filters, wallet without mint). Verify /subscriptions still returns same shape (deprecated but working).

## Summary of Changes

The route-implementation features (tributary-vysi, tributary-nwgr) shipped
their tests TDD-style alongside the routes. This task verified full coverage
of the test matrix and closed two gaps:

### Coverage verified (pre-existing, all green)

- `payment-policies.route.test.ts` (16 tests): list with filter combos
  (trackingId, gatewayPublicKey, walletPublicKey+tokenMint, userPublicKey,
  recipient), single-by-address, executions, all 400 cases (no filters,
  > 3 filters, wallet without mint, tokenMint without wallet).
- `composable-policies.route.test.ts` (14 tests): same matrix for the
  ComposablePolicy family — list, single, executions, 400 cases.
- `subscription.route.test.ts` (14 tests): unchanged, confirms `/subscriptions`
  response shape still works (deprecated alias).

### Added: shape-parity tests (2 new tests)

- `payment-policies.route.test.ts` → "Shape parity with /subscriptions":
  locks the contract that `/payment-policies` returns the same envelope
  (`success` / `data` / `timestamp`) and the same record field shape as
  `/subscriptions`. Both delegate to `getSubscriptionDetails`, so this is
  structural — the test makes it explicit and regression-proof.

### Fixed: latent mock-bleed bug in both test files

- The ">3 filters" test queued `mockResolvedValueOnce([])` on a code path
  where the route returns 400 before calling the service. The unconsumed
  mock value polluted the queue and caused later tests calling the service
  to receive a stale empty array (404 instead of expected 200).
- Removed the dead `mockResolvedValueOnce` from both `payment-policies` and
  `composable-policies` ">3 filters" tests — the service is never reached
  on a 400 rejection, so mocking its return was incorrect.

### Results

- `pnpm --filter @tributary-so/api test`: 238 passed (17 suites)
- `pnpm --filter @tributary-so/api run lint`: clean
- `tsc --noEmit`: clean
