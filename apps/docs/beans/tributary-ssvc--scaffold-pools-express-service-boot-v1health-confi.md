---
# tributary-ssvc
title: 'Wire pools module into apps/api: routes/pools.ts + services/pools-sync.ts + db/pools.ts + dedicated sync DB pool'
status: todo
type: task
priority: normal
created_at: 2026-07-29T19:08:06Z
updated_at: 2026-07-30T09:07:14Z
parent: tributary-s8y9
blocked_by:
    - tributary-z6fr
---

assigned: implementer

No new app. Wire the pool resolver INTO apps/api:
- `routes/pools.ts` — GET /v1/pools/search (handler implemented in task g6uq); register in `routes/index.ts` next to `assetsRouter`.
- `services/pools-sync.ts` — the sync/indexing service module; boot it in `index.ts` beside `wsService` / `kafkaConsumer` (same boot slot, but it drives a proactive ~5min interval).
- `db/pools.ts` — data layer against the `pools` schema (pools + tokens tables from the pools-data epic).
- **DEDICATED postgres pool for the sync module** — a separate `postgres()` instance, NOT the `getDb()` `max:1` client, so the crawler never starves request-serving (milestone REWRITTEN SCOPE, connection consequence).
Reuse apps/api posture: `redis.ts` cache, `ipRateLimit`, `asyncHandler`, `errorHandler`.
