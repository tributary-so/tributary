---
# tributary-ijuw
title: Test schema — upsert ON CONFLICT, TTL/drain delete, index usage
status: completed
type: task
created_at: 2026-07-29T19:08:06Z
updated_at: 2026-07-29T19:08:06Z
parent: tributary-ergr
blocked_by:
  - tributary-z6fr
---

assigned: tester

Verify idempotent upsert (ON CONFLICT (venue,address) DO UPDATE), drain-delete of stale rows (refreshed_at TTL / not-seen-in-N), and that the rank index is used by the search query plan.

## Summary of Changes

Added `apps/api/src/__tests__/pools-schema.integration.test.ts` — a live-Postgres
integration test (`.integration.test.ts`, excluded from default `pnpm test`; runs
via `pnpm test:integration`, skips cleanly when no `POOLS_TEST_DATABASE_URL` /
`DATABASE_URL` is set). It applies the real `0002` migration to an isolated
`pools` schema on the test DB (dropped after the run) and verifies all three
properties the pool search surface depends on:

- **Upsert idempotency** — two `INSERT … ON CONFLICT (venue, address) DO UPDATE`
  writes on the same key collapse to one row, latest values winning.
- **Drain-delete by TTL** — rows with `refreshed_at` past the cutoff are deleted;
  fresh rows survive (the not-seen-in-N reconciliation).
- **Rank index** — catalog asserts `pools_rank_idx` exists keyed on
  `(stars DESC NULLS LAST, tvl DESC NULLS LAST)`; planner asserts the ranking
  `ORDER BY … LIMIT n` is an `Index Scan using pools_rank_idx` with no Sort.

### Finding for the search-route bean

The rank index is declared `NULLS LAST`, so the search query MUST emit
`ORDER BY stars DESC NULLS LAST, tvl DESC NULLS LAST` for the planner to pick
`pools_rank_idx`. A bare `ORDER BY stars DESC, tvl DESC` (NULLS FIRST) falls
back to a seq scan + sort even at 100k rows. (stars/tvl are both NOT NULL, so
NULLS ordering is data-irrelevant but planner-relevant.)

### Verification (against live PG 16 on the dev container)

- `pnpm test:integration` (POOLS_TEST_DATABASE_URL set) → 3/3 pass.
- Without a DB URL → suite skips (3 skipped), portable to CI.
- Default `pnpm test` unchanged: 238/238 (integration excluded).
- lint clean; `pnpm build` green; new file typechecks with zero errors.

Refs: tributary-ijuw (blocked-by tributary-z6fr, now completed)
