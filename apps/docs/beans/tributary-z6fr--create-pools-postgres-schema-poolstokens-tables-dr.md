---
# tributary-z6fr
title: Create `pools` postgres schema + pools/tokens tables + drizzle schema + migration
status: todo
type: task
priority: normal
created_at: 2026-07-29T19:08:06Z
updated_at: 2026-07-30T09:07:14Z
parent: tributary-ergr
---

assigned: implementer

New `pools` SCHEMA, OWNED + MIGRATED by apps/api (like `webhooks` / `signing_keys` — NOT the foreign read-only `events` table).
Tables per milestone HANDOFF section 2: `pools` PK(venue, address); `tokens` mint PK; indexes on symbol_a, symbol_b, (mint_a, mint_b), (stars DESC, tvl DESC).
Add to apps/api's drizzle schema (schema.ts, or a new schema-pools.ts targeting the `pools` schema) and generate the idempotent migration via apps/api's drizzle-kit.
The `events` table and the `api` schema (webhooks / signing_keys, bean tributary-u5mz) are NOT touched by this.
