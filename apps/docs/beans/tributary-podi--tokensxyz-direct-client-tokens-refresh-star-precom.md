---
# tributary-podi
title: tokens.xyz refresh + star precompute (reuse services/tokens-proxy.ts)
status: completed
type: task
priority: normal
created_at: 2026-07-29T19:08:06Z
updated_at: 2026-07-30T12:54:36Z
parent: tributary-s8y9
blocked_by:
  - tributary-ssvc
---

assigned: implementer

Refresh `tokens` for pooled mints, REUSING apps/api's existing tokens.xyz upstream client (`services/tokens-proxy.ts`) — same service now (milestone REWRITTEN SCOPE).
Curated mint -> asset+tier; unknown -> singleton `solana-<mint>` with known=false. Star precompute per HANDOFF section 4: stars = (a.known?1:0)+(b.known?1:0); tier1 if any side is tier1. Recompute affected pools when a tokens row changes.
Writes go through the dedicated sync DB connection.

## Summary of Changes

tokens.xyz trust refresh + star precompute, reusing the existing
`services/tokens-proxy.ts` (same service — milestone REWRITTEN SCOPE). Green:
lint clean, 0 typecheck errors, 266 tests pass (5 new).

- `services/pools-tokens.ts` — `refreshPoolsTokens(opts)`: gathers distinct
  pooled mints whose `tokens` row is missing or stale (>1h, capped at 200/tick),
  resolves each via `resolveAsset` (concurrency 5; tokens-proxy Redis-caches
  resolve for 10min), writes a `tokens` row (`known` = has a real identity;
  `tier` from upstream `trustTier`; identity symbol/name/decimals/logoUri),
  then `recomputeStarsForMint` for each touched mint (HANDOFF §4). Per-mint
  failures isolated (logged + skipped) — one bad mint never aborts the refresh.
  Unknown mints still get a row with `known=false` (trust is a ranking layer,
  never a gate).
- `db/pools.ts` — `getMintsNeedingRefresh(db, { maxAgeMs, limit })`: distinct
  mints from the `pools` index lacking a fresh `tokens` row.
- `services/pools-sync.ts` — `registerPostSyncHook(fn)` seam; hooks run after
  venue normalizers each tick with per-hook error isolation.
- `index.ts` — registers `refreshPoolsTokens` as a post-sync hook.
- `tokens-proxy.ts` + `tokens-client/types.ts` — `ResolveResult` gains an
  optional `tier` (upstream `trustTier`), so podi can populate tier1 when
  tokens.xyz surfaces it. Additive, non-breaking.

Assumption recorded (milestone §7): the resolve endpoint's tier is surfaced
defensively (`upstream.trustTier ?? null`); if tokens.xyz doesn't return it,
`tier` is null and tier1 stays false — stars (the DoD-critical 2★/0★ signal)
are always correct off `known`. The tier1 path activates the moment upstream
provides the field.
