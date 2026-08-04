---
# tributary-ta6g
title: Raydium CLMM indexer stores null ammConfig (reads r.ammConfig, real API field is r.config)
status: completed
type: bug
priority: high
created_at: 2026-08-04T19:59:20Z
updated_at: 2026-08-04T20:02:16Z
---

## Root cause

`services/raydium-sync.ts#normalizeRaydiumPool` reads `r.ammConfig` / `r.ammConfigId` for the ammConfig account, but the live Raydium api-v3 `/pools/info/list?poolType=concentrated` response puts the ammConfig under **`config`**:

```json
"config": { "id": "3h2e43...AQpL", "index": 8, "tradeFeeRate": 400, "tickSpacing": 1, ... }
```

Both looked-for keys are undefined → `extras.ammConfig` stores `null` in the DB → Mill's pool picker gets no ammConfig → Raydium CLMM swap templates cannot pin the second account in the ForwardConfig.

Secondary issue: even the (broken) test path stored the whole `config` **object** in `extras.ammConfig`, but the frontend does `String(extras.ammConfig)` (`pool-picker.tsx`) → would yield `"[object Object]"`. The consumer (`new PublicKey(requireParam(params,"ammConfig"))`) needs the **address string** = `config.id`.

Confirmed against the live API: `GET https://api-v3.raydium.io/pools/info/list?poolType=concentrated&poolSortField=default&sortType=desc&pageSize=1&page=1`.

## Fix (TDD)

- [x] `raydium-sync.ts`: read `r.config?.id` → store address string in `extras.ammConfig`; prefer `r.config?.tradeFeeRate` for feeRate (keep legacy fallbacks).
- [x] `raydium-sync.service.test.ts`: update `rawPool` mock to the real `config: {id,index,tradeFeeRate,...}` shape; assert `extras.ammConfig === "cfgA"` (string, not object).
- [x] `pnpm --filter @tributary-so/api test` green (306/306); `tsc --noEmit` clean; lint clean.

## Why not frontend-derivation

Data already exists upstream; indexer misreads the key. Frontend RPC-decode of CLMM PoolState or a browser→Raydium call would be strictly more code + more fragile. Fix once at source; next sync tick repopulates the DB for all pools-client consumers.

## Summary of Changes

- **`services/raydium-sync.ts`** (`normalizeRaydiumPool`): read the ammConfig account from `r.config` (real api-v3 field), not the non-existent `r.ammConfig`. `extras.ammConfig` now stores `config.id` — the base58 address string the downstream consumer expects — instead of the whole object (which would `String()` into `[object Object]`). `feeRate` now reads `config.tradeFeeRate` first (was silently falling through to the decimal `r.feeRate`). Legacy `r.ammConfig`/`r.ammConfigId` kept as last-ditch fallbacks for upstream-rename resilience.
- **`__tests__/raydium-sync.service.test.ts`**: `rawPool` mock updated to the real `config: {id, index, protocolFeeRate, tradeFeeRate, tickSpacing, fundFeeRate, ...}` shape; assertion updated to `extras.ammConfig === "cfgA"` (string).
- Verified TDD: RED (test failed against unfixed normalizer — feeRate null, extras mismatch) → GREEN (11/11 raydium-sync, 306/306 full API suite; tsc clean; lint clean).

**Deploy note:** existing DB rows still hold `extras.ammConfig = null`; the next `raydiumSync` tick repopulates them (upsert is idempotent). No migration needed.
