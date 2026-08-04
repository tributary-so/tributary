---
# tributary-9b3g
title: Orca Whirlpool normalizer (v1/whirlpools, defensive)
status: completed
type: task
priority: high
created_at: 2026-07-31T22:51:09Z
updated_at: 2026-07-31T23:06:56Z
parent: tributary-lgkx
---

Mirror raydium-sync.ts against https://api.mainnet.orca.so/v1/whirlpools (returns full list, ~17MB, ignores limit/offset). Endpoint origin currently CF-1016; build defensively with multi-shape extractPools (like Raydium extractPage). Fields: whirlpoolAddress, tokenA/B{mint,symbol,decimals}, feeRate, tvl/liquidity. registerPoolNormalizer('whirlpool',...) in index.ts. Unit test with mocked shape.

## Summary of Changes

- services/whirlpool-sync.ts: Orca Whirlpool normalizer mirroring raydium/meteora. GET https://api.mainnet.orca.so/v1/whirlpools (FLAT full-list, ~17MB, ignores pagination). Defensive field reads (tokenA/tokenB OR flat mint_a/b; whirlpoolAddress/address). extractPools handles array / {data:{whirlpools}} / {whirlpools}. floor ONLY binds on explicit TVL (Orca REST may omit clean USD TVL — dropping everything would defeat the normalizer; stars still rank unknown-TVL pools). 429/5xx backoff.
- whirlpool-sync.service.test.ts: 10 cases. 10/10 green.
- index.ts: registerPoolNormalizer('whirlpool', whirlpoolSync).
