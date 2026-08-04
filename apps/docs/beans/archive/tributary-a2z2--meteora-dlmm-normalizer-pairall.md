---
# tributary-a2z2
title: Meteora DLMM normalizer (pair/all)
status: completed
type: task
priority: high
created_at: 2026-07-31T22:51:09Z
updated_at: 2026-07-31T23:21:56Z
parent: tributary-lgkx
---

Mirror raydium-sync.ts. GET https://dlmm-api.meteora.ag/pair/all (flat array, no pagination). Fields: address, mint_x/y, name_x/y→symbol, decimals_x/y, tvl→number, fee_percentage→fee_rate, liquidity fallback. extras: {binStep?}. registerPoolNormalizer('meteora',...) in index.ts. Unit test mirroring raydium-sync.service.test.ts.

## Summary of Changes

- services/meteora-sync.ts: Meteora DLMM normalizer mirroring raydium-sync. GET https://dlmm-api.meteora.ag/pair/all (FLAT array, no cursor — one-shot). normalizeMeteoraPool maps {address, mint_x/y, name_x/y→symbol, decimals, tvl→numeric, liquidity fallback, fee_percentage→fee_rate, bin_step→extras}. extractPools handles array / {data} / {rows} envelopes. 429/5xx backoff. pages=1 (shape parity with raydiumSync).
- meteora-sync.service.test.ts: 10 cases (field map, floor, liquidity fallback, identity-missing, flat-array fetch, envelope tolerance, 429 retry, 5xx exhaust, sync+drain, empty-batch). 10/10 green.

## REWRITTEN SCOPE — Meteora is LIVE-PROXY, not indexer (2026-08-01)

Per POOL-API deviation #7 / §6.1: Meteora already has free-text, so DO NOT index it. The earlier indexer (meteora-sync.ts via pair/all) was scrapped — it contradicted the locked decision.

## Summary of Changes (live-proxy)

- services/meteora-resolver.ts: searchMeteoraLive — forwards query to /pair/all_by_groups?search_term= (env-overridable path; defensively parsed — groups/array/data envelopes), normalizes to PoolSearchHit, trust-joins inline via resolveAsset (Redis-cached; live mints aren't in the indexed tokens table → stars derive per-query = known(a)+known(b)). 429/5xx retry once. No TVL floor (D6 floor is indexed-only; Meteora ranks upstream).
- services/pools-sync.ts: added PoolResolver type + registerPoolResolver/getLiveResolver (live registry, parallel to indexed normalizers).
- services/pools-search.ts: dispatch — live resolver if registered for venue, else indexed searchPools; singleton fallback applies after BOTH; live-resolver throw degrades to [] (empty-not-500).
- index.ts: registerPoolResolver('meteora', searchMeteoraLive).
- meteora-resolver.service.test.ts: 11 cases (normalize, extract groups/array/data, fetch params + retry + 5xx, trust-join stars, per-mint isolation, empty upstream, mint dedupe). 11/11 green.
- FLAG: dlmm-api.meteora.ag unreachable from this env (all paths CF-404); path isolated + env-overridable (METEORA_API_BASE / METEORA_SEARCH_PATH) — one-line fix when reachable from deploy host.
