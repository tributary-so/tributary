---
# tributary-432y
title: 'Fix pool-index sync: three DB query bugs + tokens.xyz shape drift + error logging'
status: completed
type: bug
priority: high
created_at: 2026-08-02T18:08:40Z
updated_at: 2026-08-02T18:08:40Z
---

The pools sync pipeline was silently broken in four places, all hidden behind drizzle's DrizzleQueryError which swallows the real Postgres cause.

1. drainStalePools (db/pools.ts): Date param in raw sql tag → ERR_INVALID_ARG_TYPE. Fixed by switching to the builder API (eq/lt).

2. getMintsNeedingRefresh (db/pools.ts): two bugs — (a) SELECT DISTINCT mint ambiguous after join (PG 42702), fixed by qualifying m.mint; (b) same Date-in-sql-tag bug, fixed by ISO-stringifying the cutoff.

3. recomputeStarsForMint (db/pools.ts): tier1 assignment yielded NULL via three-valued logic (NULL OR NULL) on the NOT NULL column → PG 23502 on every pool where neither leg is tier1. Fixed with COALESCE(..., false).

4. tokens-proxy.ts: upstream changed response shape from flat to nested {asset:{symbol,name}, variant:{trustTier}}. Old parser read flat fields → all null → guard always failed → only MINT_OVERRIDES fallback worked. Fixed to parse nested envelope; known flag now derived from tier (!= tier3).

5. Added describeError() helper (services/errors.ts) that unwraps DrizzleQueryError.cause chain. Applied to all 5 sync-path error log sites so future DB errors show their real SQLSTATE code + message instead of an opaque query dump.
