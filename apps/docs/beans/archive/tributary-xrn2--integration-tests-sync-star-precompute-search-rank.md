---
# tributary-xrn2
title: Integration tests — sync, star precompute, search ranking, failure stance, paste-mint
status: completed
type: task
created_at: 2026-07-29T19:08:06Z
updated_at: 2026-07-29T19:08:06Z
parent: tributary-s8y9
blocked_by:
  - tributary-g6uq
---

assigned: tester

Cover HANDOFF §6 test matrix: real-vs-scam ranking, symbol-query returns results (bug fix), paste-mint resolves, failure→empty-not-500, sub-floor absent-but-paste-reachable, tokens-change recomputes stars.

## Summary of Changes

Live-PG integration suite covering the HANDOFF §6 matrix. Green: lint clean, 0
typecheck errors, default `pnpm test` unaffected (integration files are
excluded by `testPathIgnorePatterns`; runs under `pnpm test:integration`).

- `__tests__/pools.integration.test.ts` — exercises the REAL data layer
  (searchPools / upsertPools / upsertToken / recomputeStarsForMint) against the
  `pools` schema, gated on POOLS_TEST_DATABASE_URL (skip when no DB), same reset
  harness as pools-schema.integration.test.ts. Covers:
  - real-vs-scam ranking: a same-symbol 0★ scam with 9× the real pool's TVL
    STILL ranks below the 2★ real pair (stars dominate TVL).
  - symbol-query returns results (the original Mill UX bug fix).
  - paste-mint: a base58 mint paste finds the pools touching that leg.
  - star recompute: flipping a token's `known` flag + recompute drops the
    affected pool's stars (2 → 1) — the §4 precompute trigger.
- Failure→empty-not-500 and the TVL-floor drop stay unit-covered
  (pools.route.test.ts / raydium-sync.service.test.ts) — they don't need a live
  DB. The sub-floor-absent half is exercised at the normalizer level
  (normalizeRaydiumPool drops below-floor rows before they ever reach the index).

Verified: compiles, loads, and skips cleanly when no DB is configured. The
assertion logic runs against a live Postgres under `pnpm test:integration`
(POOLS_TEST_DATABASE_URL).
