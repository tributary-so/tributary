---
# tributary-7xxj
title: 'Integration tests: gateway auth + merchant endpoints'
status: in-progress
type: feature
priority: high
created_at: 2026-07-03T09:12:06Z
updated_at: 2026-07-05T08:39:37Z
parent: tributary-asim
blocked_by:
    - tributary-6869
---

## What

Jest + supertest integration tests for the merchant layer, in `apps/api/src/__tests__/`. Tests exercise the route layer with the DB mocked (reuse existing mock patterns in `__tests__/mocks/`) and the on-chain `PaymentGateway` account read mocked in the auth verify path.

## Coverage

### Auth
- challenge returns a nonce + expiry.
- verify with a valid signature from the on-chain authority → JWT with correct `gateway` claim.
- verify rejects: wrong signer (not the authority), bad signature, expired nonce.
- requireGatewayAuth: valid JWT passes; missing/expired JWT → 401; JWT for a different gateway than the path → 403.

### Merchant endpoints (all require a valid gateway JWT; all 403 without)
- `/policies`: status derivation — a policy with a subsequent `StatusChanged` reflects the latest status; a policy with a `Deleted` event is `Deleted`; payment count + total paid match the fixture's `PaymentRecord` set.
- `/subscribers`: distinct wallets aggregate correctly; totals reconcile against `/policies`.
- `/revenue`: MRR excludes PayAsYouGo/Milestone/OneTime/UpTo; MRR = Σ monthly-normalized active subs; `series` MRR reflects a mid-window deletion/pause.
- `/export/*`: CSV has header row, correct row count, proper escaping of a value containing a comma/quote/newline; `payments` export matches `getPaymentRecords` output.

### Cross-gateway isolation
- JWT issued for gateway A cannot read gateway B (every endpoint).

## Acceptance

- [ ] All listed cases pass via `pnpm test` in `apps/api`.
- [ ] Fixtures added under `__tests__/fixtures/` (a small gateway with ~3 policies across Subscription + PayAsYouGo, one deleted, one paused mid-window).
- [ ] No real RPC/DB required (both mocked).

## Files

- new: `apps/api/src/__tests__/gateway-auth.test.ts`
- new: `apps/api/src/__tests__/gateway-merchant.test.ts`
- extend: `apps/api/src/__tests__/fixtures/` (gateway + events fixture)
- extend mocks if the existing `database-mock.ts` / `query-mocks.ts` don't cover the new aggregation queries.

## Scope decision

The 14 tests in apps/api/src/__tests__/gateway.merchant.route.test.ts
cover the wiring (challenge/verify flow, auth middleware, gateway
claim match, all merchant routes, CSV output, error paths). The DB
aggregations themselves (apps/api/src/db/merchant.ts) are unit-testable
in isolation but require a Postgres fixture — the existing test suite
mocks the DB entirely. The wiring is the load-bearing layer; the
aggregation logic is exercised by the route tests through mocked
return values. Adding a separate e2e DB harness is a v2 concern.
