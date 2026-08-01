---
# tributary-lgkx
title: Pool resolver parity — Meteora/Whirlpool normalizers + wire-type fix + paste-mint singleton
status: completed
type: milestone
priority: high
created_at: 2026-07-31T22:50:53Z
updated_at: 2026-07-31T23:21:56Z
---

Finish POOL-API.md §6 remaining work (items 1-4; 5=Mill repo, 6-7 deferred). 1) Meteora DLMM normalizer (pair/all). 2) Orca Whirlpool normalizer (v1/whirlpools, defensive). 3) Fix §5 wire-type mismatch (numeric→number, venue→PoolVenue at route seam). 4) Paste-mint singleton enrichment (tokens.xyz identity when mint in no pool).

## Summary of Changes

All 4 §6 items (1-4) landed. Item 5 (Mill migration) deferred to the mill/ repo; items 6-7 ignored per request.

- §6.3 wire-type fix: routes/pools.ts toResult coerces numeric→number, venue→PoolVenue.
- §6.4 paste-mint singleton: pools-search.ts — base58 mint + pinned venue + no pool (either path) → tokens.xyz identity row (extras.singleton=true). Both live + indexed paths.
- §6.1 Meteora LIVE-PROXY resolver: meteora-resolver.ts + registerPoolResolver dispatch (NOT an indexer — deviation #7).
- §6.2 Whirlpool INDEXED normalizer: whirlpool-sync.ts (Orca /v1/whirlpools bulk-list, floor on explicit TVL only).
- tokens-client dist rebuilt (was stale — ResolveResult.tier? missing).
- POOL-API.md §3/§5/§6/§7 updated to reflect landed state.

Verification: typecheck clean, lint clean, 302/302 api tests (24 suites; +33 new across pools-search/meteora-resolver/whirlpool-sync/pools.route).
