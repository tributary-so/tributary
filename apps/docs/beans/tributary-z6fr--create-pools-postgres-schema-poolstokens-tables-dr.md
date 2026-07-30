---
# tributary-z6fr
title: Create `pools` postgres schema + pools/tokens tables + drizzle schema + migration
status: completed
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

## Summary of Changes

- `apps/api/src/db/schema-pools.ts` (new): dedicated `pools` schema via `pgSchema("pools")`, with
  `pools` (composite PK `venue,address`; cols address/venue/mint_a/mint_b/symbol_a/symbol_b/
  tvl/fee_rate/stars/tier1/extras/refreshed_at) and `tokens` (mint PK; known/tier/symbol/name/
  decimals/logo_uri/refreshed_at). Indexes: `pools_symbol_a_idx`, `pools_symbol_b_idx`,
  `pools_mints_idx` (mint_a,mint_b), `pools_rank_idx` (stars DESC, tvl DESC). Exports `Pool`/
  `NewPool`/`PoolToken`/`NewPoolToken` types.
- `apps/api/drizzle.config.ts`: schema glob now `["./src/db/schema.ts","./src/db/schema-pools.ts"]`.
- `apps/api/src/db/migrations/0002_melted_squadron_supreme.sql` (generated, additive): `CREATE SCHEMA
"pools"` + both tables + all four indexes; journal + snapshot meta updated. No `CREATE SCHEMA IF
NOT EXISTS` — drizzle migrations are journal-gated (applied once), so idempotency is at the
  migration level, matching the existing 0000/0001 posture.
- Untouched: `src/db/schema.ts` (events/webhooks/signing_keys) and the `api` schema.

Verified: lint clean; `pnpm build` green; `pnpm test` 238/238 pass; schema file typechecks with
zero errors. Sibling test bean tributary-ijuw (upsert ON CONFLICT, drain-delete, rank-index plan)
remains todo — covers this schema once it lands.
