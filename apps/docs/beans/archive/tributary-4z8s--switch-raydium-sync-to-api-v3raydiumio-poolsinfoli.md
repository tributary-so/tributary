---
# tributary-4z8s
title: Switch raydium-sync to api-v3.raydium.io /pools/info/list (page-based)
status: completed
type: task
priority: normal
created_at: 2026-08-02T17:32:59Z
updated_at: 2026-08-02T17:39:33Z
---

Old endpoint https://api.raydium.io/v3/mainnet/pools/info/list-v2 returns 404; api-v3 host's list-v2 rejects poolType=concentrated. Switch to the documented page-based /pools/info/list (pageSize+page+hasNextPage). Update unit tests.

## Summary of Changes

`apps/api/src/services/raydium-sync.ts` — switched from the dead `api.raydium.io/v3/mainnet/pools/info/list-v2` (cursor) endpoint to the documented `api-v3.raydium.io/pools/info/list` (page-based) endpoint:

- `DEFAULT_API_BASE`: `https://api.raydium.io/v3/mainnet` → `https://api-v3.raydium.io` (with comment explaining the legacy host 404s and list-v2 rejects `poolType=concentrated`).
- Path: `/pools/info/list-v2` → `/pools/info/list`.
- Params: dropped opaque `nextPageId`+`size`; added 1-indexed `page`+`pageSize` and the now-mandatory `poolSortField=default` (api-v3 returns HTTP 500 + `{success:false,msg:"query poolSortField type error"}` without it; "default" = 24h volume = legacy behavior; pagination is exhaustive so sort doesn't affect coverage).
- `RaydiumListPage` type: `{data, nextPageId}` → `{data, hasNextPage}`.
- `fetchRaydiumPage` signature: `nextPageId?` → `page?`.
- `extractPage`: reads `body.data.hasNextPage` instead of the opaque cursor.
- `raydiumSync` loop: page counter increments, terminates on `!hasNextPage`.
- Added a `body.success === false` guard (api-v3 can return HTTP 200 with `{success:false,msg}\} on rejected queries — without this the sync silently indexed nothing).

`apps/api/src/__tests__/raydium-sync.service.test.ts` — updated to match: page-query assertions (`pageSize`, `page=1`, `poolSortField=default`, no `list-v2`), replaced the opaque-cursor test with a `success:false`-throws test, two-page sync uses `hasNextPage: true/false`.

Verified: `npx tsc --noEmit` clean; 11/11 unit tests pass; `pnpm run lint` clean; live smoke `fetchRaydiumPage({pageSize:5})` against the real `api-v3.raydium.io` returned 5 raw pools, 4 normalized above the $1k floor, sample WSOL/USDC pool.
