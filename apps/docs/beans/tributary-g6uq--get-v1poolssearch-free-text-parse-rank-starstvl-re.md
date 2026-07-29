---
# tributary-g6uq
title: GET /v1/pools/search — free-text parse, rank (stars,tvl), Redis cache, empty-not-500, IP rate-limit
status: todo
type: task
priority: normal
created_at: 2026-07-29T19:08:06Z
updated_at: 2026-07-30T09:07:14Z
parent: tributary-s8y9
blocked_by:
    - tributary-jh0p
    - tributary-podi
---

assigned: implementer

`GET /v1/pools/search` at `apps/api/src/routes/pools.ts` (registered in `routes/index.ts`).
Parse q (split on [\\/\\-\\s_]); match symbol_a | symbol_b | mint_a | mint_b | address. Rank ORDER BY stars DESC, tvl DESC. Response envelope per HANDOFF section 2.
Failure stance ADR-0028 D3: upstream/sync error -> 200 + results:[]. Redis cache per-(q, venue, limit) ~30s (reuse apps/api `redis.ts`). `venue` optional (Mill fixes it to template.lane).
