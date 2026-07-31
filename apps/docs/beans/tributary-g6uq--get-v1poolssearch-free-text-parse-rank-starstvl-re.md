---
# tributary-g6uq
title: GET /v1/pools/search — free-text parse, rank (stars,tvl), Redis cache, empty-not-500, IP rate-limit
status: completed
type: task
priority: normal
created_at: 2026-07-29T19:08:06Z
updated_at: 2026-07-30T13:05:23Z
parent: tributary-s8y9
blocked_by:
  - tributary-jh0p
  - tributary-podi
---

assigned: implementer

`GET /v1/pools/search` at `apps/api/src/routes/pools.ts` (registered in `routes/index.ts`).
Parse q (split on [\\/\\-\\s_]); match symbol_a | symbol_b | mint_a | mint_b | address. Rank ORDER BY stars DESC, tvl DESC. Response envelope per HANDOFF section 2.
Failure stance ADR-0028 D3: upstream/sync error -> 200 + results:[]. Redis cache per-(q, venue, limit) ~30s (reuse apps/api `redis.ts`). `venue` optional (Mill fixes it to template.lane).

## Summary of Changes

Completes the search endpoint: adds the ~30s Redis cache, makes `venue`
optional, and widens the free-text delimiter set. Green: lint clean, 0
typecheck errors, 270 tests pass (4 new).

- `services/pools-search.ts` — `searchPoolsCached(query, { venue?, limit })`:
  thin Redis cache (reuse `redis.ts`) keyed per-(venue, limit, query), ~30s TTL.
  A hit short-circuits the DB query; a miss queries then populates. No REDIS_URL
  → no cache, just the underlying query (cache ops are best-effort in redis.ts).
- `db/pools.ts` — `searchPools` now takes optional `venue` (omitted → search all
  venues); free-text parse splits on `[/\-\s_]` (symbols, mints, addresses).
  Ranking unchanged: `stars DESC NULLS LAST, tvl DESC NULLS LAST` (pools_rank_idx).
- `routes/pools.ts` — calls `searchPoolsCached`; `venue` is now optional
  (omitted → `venue: null` echoed, searches all venues). ipRateLimit (120/min)
  and the empty-not-500 failure stance (ADR-0028 D3) carry over from tributary-ssvc.
- Tests: `pools-search.service.test.ts` (cache hit short-circuit, miss populate,
  per-(venue,limit,query) keying, venue-undefined passthrough) + updated
  `pools.route.test.ts` (mocks the cache layer; venue-optional 200 assertion).

Note: the live-PG ranking/index assertions (real pair 2★ above a same-symbol
0★ scam, symbol-search returns results) stay in xrn2's integration suite — the
ranking SQL + parse are exercised here against mocked results.
