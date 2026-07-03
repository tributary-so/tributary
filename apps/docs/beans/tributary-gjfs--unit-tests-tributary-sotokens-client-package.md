---
# tributary-gjfs
title: 'Unit tests: @tributary-so/tokens-client package'
status: todo
type: feature
priority: normal
created_at: 2026-07-03T10:13:56Z
updated_at: 2026-07-03T10:14:11Z
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
