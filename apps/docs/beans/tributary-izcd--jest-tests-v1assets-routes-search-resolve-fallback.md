---
# tributary-izcd
title: 'Jest tests: /v1/assets routes (search + resolve + fallback)'
status: todo
type: feature
priority: normal
created_at: 2026-07-03T10:13:55Z
updated_at: 2026-07-03T10:14:11Z
parent: tributary-d3r3
blocked_by:
    - tributary-re15
---

Jest tests for the new proxy routes in `apps/api/src/__tests__/`.

Scope:
- Mock upstream tokens.xyz responses (use the SpaceX example from milestone)
- Search: returns projected AssetSearchResult[], filters out results with no valid primaryVariant.mint
- Resolve: returns ResolveResult, falls back to MINT_OVERRIDES on upstream 5xx/timeout
- Redis cache hit/miss (mock redis client)
- IP rate limit triggers at 121st request

Acceptance:
- [ ] `assets.search.test.ts` — happy path, empty query, upstream error → []
- [ ] `assets.resolve.test.ts` — happy path, unknown mint, upstream error → MINT_OVERRIDES fallback
- [ ] Rate limit test
- [ ] All existing tests still pass (`npm run test`)
