---
# tributary-jh0p
title: Raydium CLMM sync job + normalizer → `pools` (cursor list-v2, TVL floor, idempotent upsert, ammConfig→extras)
status: completed
type: task
priority: normal
created_at: 2026-07-29T19:08:06Z
updated_at: 2026-07-30T12:38:27Z
parent: tributary-s8y9
blocked_by:
  - tributary-ssvc
---

assigned: implementer

Sync GET /pools/info/list-v2?poolType=concentrated&sortType=desc&size=1000 with opaque nextPageId cursor. Normalize → pools row: address, venue='raydium', mint_a/b, symbol_a/b, tvl, fee_rate, extras={ammConfig}. Drop rows below ~$1k TVL floor (HANDOFF §3). Idempotent upsert; drain stale. Runs on a ~5min interval with backoff on 429/5xx, via the dedicated sync DB connection (not the max:1 request client).

## Summary of Changes

Raydium CLMM normalizer + registration. Green: lint clean, 0 typecheck errors,
261 tests pass (11 new).

- `services/raydium-sync.ts`:
  - `fetchRaydiumPage` — `GET {RAYDIUM_API_BASE}/pools/info/list-v2?poolType=
concentrated&sortType=desc&size=<N>&nextPageId=<cursor>`; exponential backoff
    on 429/5xx (retries configurable), immediate throw on other 4xx, network
    errors retried. Extracts the pool array + opaque `nextPageId` from either
    envelope shape (`data.data` or `data` as array).
  - `normalizeRaydiumPool` — defensive field mapping (address←id, mint_a/b←
    mintA/mintB.address+symbol, tvl←tvl, fee_rate←ammConfig.tradeFeeRate,
    extras={ammConfig}); drops rows missing a usable identity (address + both
    mints) or below the TVL floor. Tolerates minor upstream shape drift.
  - `raydiumSync` — paginates to completion (100-page safety ceiling), floors,
    idempotent `upsertPools(getSyncDb(), rows)` via the DEDICATED pool, then
    `drainStalePools("raydium", now−10min)` so vanished pools stop being served.
  - Config: `RAYDIUM_API_BASE`, `RAYDIUM_PAGE_SIZE`, `POOLS_TVL_FLOOR` (all
    env-overridable); fetch/baseUrl/pageSize/floor/backoff injectable for tests.
- `index.ts` — one registry line: `registerPoolNormalizer("raydium", …)` before
  `startPoolsSync()`. Adding a venue = one more registry line (milestone §DoD).
- Tests `raydium-sync.service.test.ts` (11): normalization + floor drop,
  cursor query build + pagination, idempotent upsert + drain, 429 backoff,
  5xx exhaustion, non-retryable 404. Fetch + DB layer mocked — no live endpoint
  needed (Raydium has no free-text upstream; the index IS the feature).

Assumption recorded (milestone §7): the exact Raydium v3 list-v2 field shape is
mapped defensively and env-overridable; it gets validated on first live sync
(the sandbox cannot reach api.raydium.io — every route returns a canned 404).
Star precompute (stars/tier1) stays podi's concern — this layer writes pool
rows only.
