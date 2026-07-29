---
# tributary-jh0p
title: Raydium CLMM sync job + normalizer → `pools` (cursor list-v2, TVL floor, idempotent upsert, ammConfig→extras)
status: todo
type: task
priority: normal
created_at: 2026-07-29T19:08:06Z
updated_at: 2026-07-30T09:07:14Z
parent: tributary-s8y9
blocked_by:
    - tributary-ssvc
---

assigned: implementer

Sync GET /pools/info/list-v2?poolType=concentrated&sortType=desc&size=1000 with opaque nextPageId cursor. Normalize → pools row: address, venue='raydium', mint_a/b, symbol_a/b, tvl, fee_rate, extras={ammConfig}. Drop rows below ~$1k TVL floor (HANDOFF §3). Idempotent upsert; drain stale. Runs on a ~5min interval with backoff on 429/5xx, via the dedicated sync DB connection (not the max:1 request client).
