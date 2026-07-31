---
# tributary-6p2p
title: Review pools module in apps/api epic
status: completed
type: task
priority: normal
created_at: 2026-07-29T19:08:07Z
updated_at: 2026-07-30T09:07:38Z
parent: tributary-s8y9
blocked_by:
  - tributary-xrn2
---

assigned: reviewer

Review sync job robustness (cursor/backoff/partial-sync), star-precompute correctness, failure-stance discipline, and that apps/api + tokens-client are untouched. Check DoD in milestone HANDOFF §5.

## Review report

Verdict: **APPROVE**. The pools module meets the HANDOFF §5 DoD. All green:
lint clean, 0 typecheck errors, `pnpm --filter @tributary-so/api build` (tsup)
green, 270 unit tests pass; 3 live-PG integration suites (skip-clean here, run
under `pnpm test:integration`). One coverage gap closed by this review.

### DoD checklist (HANDOFF §5) — all met

- ✅ search ranking — `searchPools` ranks `stars DESC NULLS LAST, tvl DESC NULLS
LAST` (served by `pools_rank_idx`); xrn2 asserts a same-symbol 0★ scam with
  9× TVL ranks below the 2★ real pair.
- ✅ symbol search returns results (the original Mill bug fix) — symbol-pair +
  single-symbol parse; xrn2 asserts non-empty.
- ✅ paste-mint resolves + finds pools — base58 mint/address match on either leg.
- ✅ adding a venue = one `registerPoolNormalizer` line (Raydium wired in
  index.ts); no client/route/branch per venue.
- ✅ sub-floor absent / paste-reachable — `normalizeRaydiumPool` drops below-floor
  rows at sync (unit-tested); paste resolves the mint identity via `/v1/assets`.
- ✅ keys server-side; failure stance empty-not-500 (route try/catch → 200 + []).
- ✅ pools-client is a SEPARATE package pointed at `/v1/pools/search`; the service
  lives inside apps/api per REWRITTEN SCOPE (Q1 reversed).
- ✅ `/v1/assets` route untouched (only its original feat commit touches it); the
  tokens-client `ResolveResult.tier` addition is additive/non-breaking.

### Concerns audited

1. **Sync robustness** — cursor pagination (100-page safety ceiling), exponential
   backoff on 429/5xx, network errors retried. A failed tick is all-or-nothing:
   `raydiumSync` throws BEFORE `upsertPools`/`drainStalePools`, so a partial fetch
   writes nothing and drains nothing (no churn). Safe degradation. Partial-sync
   reconciliation remains an accepted Open Q (§7).
2. **Star-precompute** — `recomputeStarsForMint` SQL validated by xrn2 (boolean→int
   cast, tier1 from tier). Correct: recomputes pools touching the mint on EITHER
   leg, reading both legs' tokens.
3. **`getMintsNeedingRefresh`** ⚠️ — raw SQL via `db.execute`, was only mock-tested
   → CLOSED: added `pools-mints.integration.test.ts` (distinct mints, fresh/stale
   cut, limit cap) to match recomputeStarsForMint's live-PG coverage.
4. **Failure-stance discipline** — route try/catch→empty-200; Redis cache ops are
   best-effort (swallowed in redis.ts); per-venue + per-mint error isolation in
   the sync orchestrator. ✓
5. **`venue` optional + ~30s cache** (g6uq) — cache hit short-circuits the DB
   query; keying per (venue, limit, query). ✓

### Accepted Open Qs (§7) — recorded, not blocking

- Partial-sync reconciliation (all-or-nothing per tick) — acceptable until sync
  load threatens throughput.
- `tier` only populated when tokens.xyz resolve returns `trustTier`; otherwise
  null (tier1 inactive). Stars (the DoD-critical 2★/0★ signal) are always correct
  off `known`.
- The live Raydium field shape + the two raw-SQL queries get final validation
  against real infra (this sandbox can't reach api.raydium.io and has no PG).

## Summary of Changes

- Added `__tests__/pools-mints.integration.test.ts` — live-PG coverage for
  `getMintsNeedingRefresh` (the gap found above).
