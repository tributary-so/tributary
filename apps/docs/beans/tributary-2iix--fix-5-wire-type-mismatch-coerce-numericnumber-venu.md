---
# tributary-2iix
title: 'Fix §5 wire-type mismatch: coerce numeric→number, venue→PoolVenue at route seam'
status: completed
type: task
priority: high
created_at: 2026-07-31T22:51:09Z
updated_at: 2026-07-31T22:55:09Z
parent: tributary-lgkx
---

routes/pools.ts toResult() emits tvl/feeRate as string (drizzle numeric) but pools-client types.ts declares number. Coerce at the seam: tvl: Number(hit.pool.tvl), feeRate: Number(...) : null, venue: hit.pool.venue as PoolVenue. Update pools.route.test.ts to assert numbers. TDD.

## Summary of Changes

- routes/pools.ts: `toResult` now coerces `tvl`/`feeRate` (drizzle numeric string) → `number | null` and `venue` → `PoolVenue` union. `PoolVenue` defined locally (server must not import its client pkg).
- pools.route.test.ts: asserts `typeof tvl === 'number'`, `tvl === 5000`, `feeRate === 0.0025`; added null-tvl/feeRate coercion case.
- 7/7 route tests green.
