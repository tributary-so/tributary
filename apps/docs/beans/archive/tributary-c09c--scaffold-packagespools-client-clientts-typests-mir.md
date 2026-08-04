---
# tributary-c09c
title: Scaffold packages/pools-client — client.ts + types.ts mirroring tokens-client
status: completed
type: task
priority: normal
created_at: 2026-07-29T19:08:07Z
updated_at: 2026-07-30T09:17:35Z
parent: tributary-30yg
---

assigned: implementer

createPoolsClient({baseUrl, fetch?}) → { searchPools(query, opts?) }. Types mirror the /v1/pools/search envelope (HANDOFF §2). Pure fetch, no React, no globals. Separate package (Q5) — NOT in tokens-client.

## Summary of Changes

Scaffolded `packages/pools-client/` mirroring tokens-client's structure (pure-fetch only; React hook is sibling bean tributary-xnif):

- `src/types.ts` — `PoolVenue`, `PoolToken`, `PoolSearchResult`, `PoolSearchResponse`, `SearchPoolsOptions` mirroring the HANDOFF §2 envelope.
- `src/client.ts` — `createPoolsClient({baseUrl, fetch?})` → `{ searchPools(query, opts) }`. Empty-query short-circuit, limit clamped to `[1,50]`, non-2xx → empty results (ADR-0028 D3 stance), no throw on upstream failure.
- `src/index.ts` — barrel re-exporting types + client.
- `package.json`, `tsconfig.json`, `eslint.config.js` — config matching tokens-client (no React peers yet).

Verified: `pnpm run lint` clean, `pnpm run build` green (`dist/` emits client/types/index `.js` + `.d.ts`).
