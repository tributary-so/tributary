---
# tributary-xnif
title: react.ts usePoolSearch hook (debounce 250ms, keepPreviousData, staleTime 30s, enabled gate)
status: todo
type: task
priority: normal
created_at: 2026-07-29T19:08:07Z
updated_at: 2026-07-30T10:11:17Z
parent: tributary-30yg
blocked_by:
    - tributary-c09c
---

assigned: implementer

usePoolSearch(query, {venue, enabled}) react-query hook. Debounced 250ms, keepPreviousData, staleTime 30s. Direct replacement for Mill's usePoolSearch / useRaydiumPoolSearch — ONE endpoint regardless of venue.

## Summary of Changes

Added `packages/pools-client/src/react.ts` — the `usePoolSearch` react-query v5 hook, mirroring tokens-client's `useAssetSearch` three-arg shape:

- `usePoolSearch(query, {baseUrl, fetch?}, {venue, enabled?, limit?, debounceMs?})`
- Debounce 250ms (default), `placeholderData: (prev) => prev` (keepPreviousData), `staleTime: 30_000`
- Lazy singleton client per baseUrl (no closure churn per render)
- Empty/whitespace query self-disables; `enabled` defaults true
- queryKey includes venue: `["pools", "search", venue, trimmed, limit]` — ONE hook, venue is a param not a branch

Package config updates to support the `./react` subpath:

- `package.json`: added `./react` export map, optional peer deps (`@tanstack/react-query` ^5, `react` ^18/^19), dev deps for build
- `tsconfig.json`: added `"jsx": "react-jsx"`

Verified: lint clean, build green (`dist/react.js` + `dist/react.d.ts` emitted).
