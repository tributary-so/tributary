---
# tributary-lv06
title: 'Package: @tributary-so/tokens-client (types + client + react hooks + devnetFallback)'
status: completed
type: feature
priority: high
created_at: 2026-07-03T10:12:43Z
updated_at: 2026-07-06T08:41:27Z
parent: tributary-0q93
blocked_by:
    - tributary-re15
---

New private workspace package at `packages/tokens-client/`.

Files:
- `package.json` — private, name `@tributary-so/tokens-client`, peer deps: `@tanstack/react-query`, `react`. Build via tsc.
- `tsconfig.json`
- `src/types.ts` — AssetSearchResult, ResolveResult, AssetCategory
- `src/client.ts` — createTokensClient({ baseUrl, fetch }) → { search, resolveMint, resolveRef }
- `src/react.ts` — useAssetSearch (debounced 250ms), useResolveMint, useResolveMints (uses useQueries)
- `src/devnetFallback.ts` — MINT_OVERRIDES map (USDC mainnet+devnet, SOL, USDT, mSOL). Single source of truth — apps/api imports this.
- `src/index.ts` — barrel export

Boundary: NO jotai atoms, NO UI components, NO hardcoded URLs.

Acceptance:
- [ ] `packages/tokens-client/package.json` with private:true
- [ ] types.ts matches the AssetSearchResult shape from milestone D2
- [ ] client.ts is pure fetch (injects VITE_API_BASE_URL via constructor, not hardcoded)
- [ ] react.ts exports useAssetSearch (250ms debounce, staleTime 60s), useResolveMint, useResolveMints
- [ ] devnetFallback.ts MINT_OVERRIDES exported and consumable by apps/api
- [ ] `pnpm run build` succeeds
- [ ] Exported from workspace root if convention requires

## Summary of Changes

Landed in commit efce9d0. Package at packages/tokens-client/: package.json (workspace, ESM, /react + /devnetFallback subpath exports), tsconfig.json, src/{types,client,react,devnetFallback,index}.ts. Built with tsc. Self-check test in src/devnetFallback.test.ts.
