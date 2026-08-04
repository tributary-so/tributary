---
# tributary-iuuk
title: Paste-mint singleton enrichment (tokens.xyz identity when mint in no pool)
status: completed
type: task
priority: normal
created_at: 2026-07-31T22:51:09Z
updated_at: 2026-07-31T23:00:11Z
parent: tributary-lgkx
---

POOL-API §6.4: a pasted mint currently only matches indexed pools; if in no pool, return a tokens.xyz singleton identity so the row isn't blank. In search flow: when query is a single base58 mint AND searchPools returns [], resolveAsset(mint) via tokens-proxy; if found, synthesize a singleton PoolSearchHit (stars from tokens row). TDD.

## Summary of Changes

- services/pools-search.ts: paste-mint singleton enrichment. When searchPools returns [] AND query is one base58 mint AND venue pinned → resolveAsset(mint) via tokens-proxy, synthesize a singleton PoolSearchHit (address=mint, extras.singleton=true, stars=known?1:0). Isolated (resolveAsset failure → []). Cached like any result.
- packages/tokens-client: rebuilt dist (was stale — missing tier? field on ResolveResult).
- pools-search.service.test.ts: 6 singleton cases (known mint, uncurated, venue-omitted skip, indexed-match skip, non-mint skip, resolveAsset-fail isolation). 10/10 green.
