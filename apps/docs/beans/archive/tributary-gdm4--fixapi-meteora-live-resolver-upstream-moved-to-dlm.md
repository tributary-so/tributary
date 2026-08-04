---
# tributary-gdm4
title: 'fix(api): meteora live resolver — upstream moved to dlmm.datapi.meteora.ag/pools'
status: completed
type: bug
priority: high
created_at: 2026-08-03T18:18:09Z
updated_at: 2026-08-03T18:22:29Z
---

Meteora pool search returns empty results because the live resolver still calls the DEAD endpoint dlmm-api.meteora.ag/pair/all_by_groups (HTTP 404 on every path, including /). The resolver is correctly registered (index.ts:121) but the upstream moved.

## Confirmed new contract (probed live)
- Host: dlmm-api.meteora.ag → dlmm.datapi.meteora.ag
- Path: /pair/all_by_groups → /pools
- Params: search_term → query; sort_key=tvl&order_by=desc → sort_by=tvl:desc; include_unknown=false → filter_by=is_blacklisted=false; add page=1
- Envelope: {data:[...]} flat (already handled by extractMeteoraPools)
- Fields: mint_x → token_x.address; name_x → token_x.symbol; fee_percentage → dynamic_fee_pct; bin_step → pool_config.bin_step

Verified: curl 'https://dlmm.datapi.meteora.ag/pools?query=USDC&page_size=3&sort_by=tvl:desc' → 200, 14136 pools.

## Scope
- [ ] meteora-resolver.ts: new defaults + new params + extend normalizer cascade (ADD new paths, keep old for defensiveness)
- [ ] Update top-of-file warning (no longer unreachable — fixed)
- [ ] meteora-resolver.service.test.ts: fixtures → new shape; keep one old-shape assertion to prove the cascade
- [ ] pnpm --filter @tributary-so/api test (unit tests pass)
- [ ] curl local server /v1/pools/search?q=USDC&venue=meteora → non-empty
- [ ] pnpm --filter @tributary-so/api run lint

## Summary of Changes

### Root cause
Meteora retired the `dlmm-api.meteora.ag` host entirely (Cloudflare 404 on every path, including `/`). The live resolver was registered correctly (`index.ts:121`) but was calling a dead endpoint with retired params, so every `venue=meteora` search threw `meteora live upstream 404` → caught → empty results.

### Confirmed new contract (probed live)
- Host: `dlmm-api.meteora.ag` → `dlmm.datapi.meteora.ag`
- Path: `/pair/all_by_groups` → `/pools`
- Params: `search_term`→`query`; `sort_key=tvl&order_by=desc`→`sort_by=tvl:desc`; `include_unknown=false`→`filter_by=is_blacklisted=false`; added `page=1`
- Envelope: `{data:[...]}` flat (already handled by `extractMeteoraPools`)
- Fields: mints now nested `token_x.address`/`token_y.address`; symbols under `token_x.symbol`; fee is `dynamic_fee_pct` (falls back to `pool_config.base_fee_pct`); bin_step nested under `pool_config.bin_step`

### Files changed
- `apps/api/src/services/meteora-resolver.ts`:
  - `DEFAULT_API_BASE` → `https://dlmm.datapi.meteora.ag`
  - `DEFAULT_SEARCH_PATH` → `/pools`
  - `fetchMeteoraSearch` params rewritten to the new contract
  - `normalizeMeteoraPool` cascade EXTENDED (new nested paths first, old flat paths kept as defensive fallback)
  - Updated top-of-file warning (no longer unreachable — fixed)
- `apps/api/src/__tests__/meteora-resolver.service.test.ts`:
  - Fixtures moved to the current nested shape as the primary case
  - Added `legacyRawPool()` + a dedicated test pinning the defensive cascade (retired shape still normalizes)
  - `fetchMeteoraSearch` URL test now asserts the new params AND that the old params are NOT sent
  - `searchMeteoraLive` tests updated to the `{data:[...]}` envelope

### Verification
- `npx tsx` live check: `fetchMeteoraSearch('USDC', 3)` against the real new endpoint → 3 entries, YZY-USDC pool normalized correctly (real address, real mints, binStep=100)
- `npx tsc --noEmit`: clean
- `pnpm --filter @tributary-so/api run lint`: clean
- `npx jest`: **306 tests pass** across 24 suites (14 in the meteora-resolver test alone)
