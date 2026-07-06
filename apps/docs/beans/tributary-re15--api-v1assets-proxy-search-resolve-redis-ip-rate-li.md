---
# tributary-re15
title: 'API: /v1/assets proxy (search + resolve + Redis + IP rate limit + fallback)'
status: completed
type: feature
priority: high
created_at: 2026-07-03T10:12:43Z
updated_at: 2026-07-06T08:41:27Z
parent: tributary-0q93
---

New `routes/assets.ts` router mounted at `/v1/assets`. Two endpoints:
- `GET /search?q=<query>&limit=<n>` — proxy to tokens.xyz, project to AssetSearchResult[], Redis cache 60s TTL, return [] on upstream error
- `GET /resolve?mint=<base58>` — proxy to tokens.xyz resolve, Redis cache 10min TTL, fall back to MINT_OVERRIDES on upstream error

New `services/tokens-proxy.ts` — upstream fetch client (injects x-api-key) + cache wrapper.
New `ipRateLimit` middleware in `middleware/rateLimit.ts` (120 req/min/IP).
Mount in `routes/index.ts`. Add OpenAPI annotations.
Add TOKENS_XYZ_API_KEY + TOKENS_XYZ_BASE_URL to .env.example.

Acceptance:
- [ ] `routes/assets.ts` with search + resolve handlers
- [ ] `services/tokens-proxy.ts` with upstream fetch + Redis cache
- [ ] `ipRateLimit` middleware added alongside existing `walletRateLimit`
- [ ] MINT_OVERRIDES imported from `@tributary-so/tokens-client/devnetFallback`
- [ ] OpenAPI annotations on both endpoints
- [ ] .env.example updated
- [ ] CORS allows same-origin (existing `cors()` middleware)

## Summary of Changes

Landed in commit efce9d0 (refactored in 6851695):
- apps/api/src/routes/assets.ts (NEW): GET /search + GET /resolve, ipRateLimit(120/min) at router level, JSDoc @openapi annotations
- apps/api/src/services/tokens-proxy.ts (NEW): upstream fetch with AbortSignal.timeout(4s), base58 mint validation, Redis cache (search 60s, resolve 10min), MINT_OVERRIDES fallback. Env read at call time (upstreamKey()/upstreamBase()) after TDD refactor.
- apps/api/src/services/redis.ts (NEW): lazy singleton client, no-ops without REDIS_URL
- apps/api/src/middleware/rateLimit.ts: + ipRateLimit wrapper
- apps/api/src/routes/index.ts: mount at /v1/assets
- apps/api/src/openapi.ts: + Assets tag
- apps/api/.env.example: + TOKENS_XYZ_API_KEY, TOKENS_XYZ_BASE_URL
