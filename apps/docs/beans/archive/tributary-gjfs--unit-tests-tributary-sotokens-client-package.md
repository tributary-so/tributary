---
# tributary-gjfs
title: 'Unit tests: @tributary-so/tokens-client package'
status: completed
type: feature
priority: normal
created_at: 2026-07-03T10:13:56Z
updated_at: 2026-07-06T08:41:27Z
parent: tributary-d3r3
blocked_by:
    - tributary-lv06
---

Unit tests for the shared client package in `packages/tokens-client/`.

Scope:
- client.ts: search(), resolveMint(), resolveRef() — mock fetch, assert URL + headers + projection
- react.ts: useAssetSearch debounce behavior, useResolveMints batch
- devnetFallback.ts: MINT_OVERRIDES shape validation

Acceptance:
- [ ] `client.test.ts` — search projects upstream payload to AssetSearchResult[]
- [ ] `client.test.ts` — resolveMint returns ResolveResult or null
- [ ] `react.test.ts` — useAssetSearch debounces (250ms), does not fire on empty/whitespace
- [ ] `devnetFallback.test.ts` — MINT_OVERRIDES has valid entries
- [ ] `pnpm test` passes in the package

## Summary of Changes

Landed in commit 6851695:
- packages/tokens-client/src/client.test.ts (NEW): tsx self-check for the pure-fetch client — search URL/payload, empty-query short-circuit, HTTP error → empty, limit clamp [1,50], resolveMint happy/null, resolveRef routing through search, baseUrl trailing-slash strip
- apps/api/src/__tests__/tokens-proxy.service.test.ts (NEW): 14 cases — searchAssets (key unset, whitespace, projection+filter, HTTP error, network error, cache hit, cache write, x-api-key header injection), resolveAsset (invalid mint, upstream data, MINT_OVERRIDES fallback mainnet+devnet, unknown+no-override null, cache hit)
- packages/tokens-client/src/devnetFallback.test.ts: pre-existing, unchanged
