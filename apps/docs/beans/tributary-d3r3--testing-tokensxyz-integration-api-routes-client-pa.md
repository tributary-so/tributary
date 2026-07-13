---
# tributary-d3r3
title: 'Testing: tokens.xyz integration (API routes + client package)'
status: completed
type: epic
priority: normal
created_at: 2026-07-03T10:11:53Z
updated_at: 2026-07-06T08:38:28Z
parent: tributary-fxyo
---

Testing epic: jest tests for proxy routes (upstream mock), unit tests for tokens-client package.

## Summary of Changes

Tests landed (commit on branch bean-tributary-fxyo):

**apps/api/src/__tests__/assets.route.test.ts** (12 tests, supertest + jest.mock)
- GET /search: 200 happy, default limit, 400 missing q, 400 whitespace q, empty results stance, NaN limit fallback
- GET /resolve: 200 happy, 400 missing mint, 400 invalid base58, 404 unknown+no-fallback, 200 fallback-shape
- 404 on unsupported methods

**apps/api/src/__tests__/tokens-proxy.service.test.ts** (14 tests, mock fetch + mock redis)
- searchAssets: returns empty when key unset, empty on whitespace, projects+filters non-base58 mints, empty on HTTP error, empty on network error, serves cache, writes cache, injects x-api-key header
- resolveAsset: null on invalid mint, returns upstream data, falls back to MINT_OVERRIDES on fetch error (mainnet USDC + devnet USDC), null when unknown AND not in overrides, serves cache

**packages/tokens-client/src/client.test.ts** (tsx self-check)
- search: happy path URL/payload, empty query short-circuits, HTTP error → empty, limit clamp to [1,50]
- resolveMint: happy path, non-OK → null
- resolveRef: routes through search, picks primaryVariant, null when no variant
- baseUrl trailing slash stripped

**packages/tokens-client/src/devnetFallback.test.ts** (existing, unchanged)
- validates every MINT_OVERRIDES key is base58, lookupOverride round-trips, defaultMintForNetwork correct per network

### Side-effects found and fixed during testing

- tokens-proxy.ts was capturing TOKENS_XYZ_API_KEY and TOKENS_XYZ_BASE_URL at module-load time, making the env vars impossible to flip in tests (and brittle at runtime). Refactored to read at call time via upstreamKey()/upstreamBase() helpers. Real improvement, not just a test fix.
- tokens-client client.ts: added empty-query short-circuit to match server semantics (was calling fetch with q=empty).
- packages/tokens-client/package.json exports: added 'default' conditions for resolver compatibility.
- apps/api/jest.config.ts: added moduleNameMapper for @tributary-so/tokens-client subpaths so ts-jest transforms the ESM source.

### Verification

- packages/tokens-client: `pnpm run test` runs both self-checks → OK
- apps/api: `npx jest src/__tests__/assets.route.test.ts src/__tests__/tokens-proxy.service.test.ts` → 26/26 pass
- apps/api: `npx jest` (full suite) → 219/223 pass; the 4 failures are in subscription.route.test.ts + tokens.route.test.ts and are PRE-EXISTING (verified via git stash on commit efce9d0). Zero new failures.
- tsc clean on all 4 consumers (api, showcase, app, tokens-client).
