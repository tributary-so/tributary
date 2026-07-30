---
# tributary-ssvc
title: "Wire pools module into apps/api: routes/pools.ts + services/pools-sync.ts + db/pools.ts + dedicated sync DB pool"
status: completed
type: task
priority: normal
created_at: 2026-07-29T19:08:06Z
updated_at: 2026-07-30T12:18:33Z
parent: tributary-s8y9
blocked_by:
  - tributary-z6fr
---

assigned: implementer

No new app. Wire the pool resolver INTO apps/api:

- `routes/pools.ts` — GET /v1/pools/search (handler implemented in task g6uq); register in `routes/index.ts` next to `assetsRouter`.
- `services/pools-sync.ts` — the sync/indexing service module; boot it in `index.ts` beside `wsService` / `kafkaConsumer` (same boot slot, but it drives a proactive ~5min interval).
- `db/pools.ts` — data layer against the `pools` schema (pools + tokens tables from the pools-data epic).
- **DEDICATED postgres pool for the sync module** — a separate `postgres()` instance, NOT the `getDb()` `max:1` client, so the crawler never starves request-serving (milestone REWRITTEN SCOPE, connection consequence).
  Reuse apps/api posture: `redis.ts` cache, `ipRateLimit`, `asyncHandler`, `errorHandler`.

## Summary of Changes

Wired the pool resolver INTO apps/api (no new app). End-to-end green: lint
clean, 0 typecheck errors, 250 tests pass (12 new).

- `db/pools.ts` — data layer against the `pools` schema.
  - READ (`searchPools`) uses the request pool `getDb()` (max:1); free-text →
    ranked rows (`stars DESC NULLS LAST, tvl DESC NULLS LAST`, matching
    `pools_rank_idx` so the planner uses Index Scan). Parses symbol pairs
    (`SOL/USDC`, either order), single symbols, base58 mint/address paste.
    Left-joins both token legs for full identity (decimals/logo/tier).
  - WRITE (`upsertPools`, `drainStalePools`, `upsertToken`, `getToken`,
    `recomputeStarsForMint`) take an EXPLICIT drizzle handle so the caller owns
    which pool serves them. `recomputeStarsForMint` is the star-precompute
    trigger (milestone §4) podi invokes after a token refresh.
- `services/pools-sync.ts` — the sync orchestrator module.
  - `getSyncDb()` — the DEDICATED `postgres()` instance (max:5), separate from
    `getDb()` so the crawler never starves request-serving (REWRITTEN SCOPE,
    connection consequence).
  - `registerPoolNormalizer(venue, fn)` registry + `runPoolsSyncTick` with
    per-venue error isolation + `startPoolsSync`/`stopPoolsSync` (~5min
    interval). Adding a venue = one `registerPoolNormalizer` call.
- `routes/pools.ts` — `GET /v1/pools/search`; registered in `routes/index.ts`
  next to `assetsRouter`. ipRateLimit (120/min), empty-not-500 failure stance
  (ADR-0028 D3), contract envelope (`{address,venue,tokenX,tokenY,tvl,...}`).
  Booted in `index.ts` beside wsService/kafkaConsumer.
- Tests: `pools.route.test.ts` (envelope + validation + empty-not-500, mocked
  data layer) and `pools-sync.service.test.ts` (registry + per-venue isolation +
  no-op guards). Live-PG ranking/index behaviors stay in xrn2's integration suite.

Deferred to siblings (non-overlapping seams):

- tributary-g6uq — Redis per-(q,venue) cache + paste-mint singleton resolution
  - richer free-text parse refinement (layers as a service wrapper over
    `searchPools`; route gains one call-site swap).
- tributary-jh0p — Raydium CLMM normalizer (registers via
  `registerPoolNormalizer`).
- tributary-podi — tokens.xyz refresh glue (calls `upsertToken` +
  `recomputeStarsForMint`).
