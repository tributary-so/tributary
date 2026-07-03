---
# tributary-re15
title: 'API: /v1/assets proxy (search + resolve + Redis + IP rate limit + fallback)'
status: todo
type: feature
priority: high
created_at: 2026-07-03T10:12:43Z
updated_at: 2026-07-03T10:13:05Z
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
