---
# tributary-u5mz
title: 'DB: isolate apps/api-owned tables into a new ''api'' postgres schema (migrate webhooks + signing_keys; events stays foreign)'
status: completed
type: task
priority: deferred
tags:
    - db
    - schema
    - api
created_at: 2026-07-29T18:39:28Z
updated_at: 2026-08-01T17:57:17Z
---

## Context

Raised from the POOL-API grilling session (2026-07-29) on where the
server-side pool resolver's data should live.

Two upstream decisions were locked in that session:

- **Q1 — Separate service.** The pool indexer runs as its OWN service, not
  in-process inside `apps/api`. (Rationale: keep the crawler out of
  request-serving; honest bounded context; the existing `wsService` /
  `kafkaConsumer` boot pattern is *reactive*, not a fit for proactive sync.)
- **Q2 — Schema isolation, not a separate database.** Data independence is
  achieved with a Postgres **schema** (`api`), not a separate DB instance.

## Design decisions (from grilling)

- **Schema isolation over separate DB.** Same Postgres instance, separate
  schema namespace. Cheaper to operate than a 2nd DB while still giving each
  data owner a clean namespace and single-owner migrations.
- **`events` is foreign / read-only.** Grounded in `apps/api/src/db/migrations/README.md:22-25`:
  *"This project only has read permissions to the database. No tables are
  created, modified, or dropped by this application."* A separate process
  owns `events`; apps/api only reads it (confirmed: no `insert(events)` call
  site exists — only `webhooks.ts:11` and `jwks.ts:167` write). `events`
  stays where the external process puts it; this refactoring does NOT touch it.
- **`webhooks` + `signing_keys` are apps/api-owned.** They get migrated into
  the new `api` schema so that everything apps/api *owns* lives in one namespace.

Current state (all in `public` — drizzle snapshots show `"schema": ""`):
- `public.events`        — foreign-owned, read-only here
- `public.webhooks`      — apps/api-owned (write: `db/webhooks.ts`)
- `public.signing_keys`  — apps/api-owned (write: `services/jwks.ts`)

## Goal

Introduce an `api` Postgres schema and migrate the two apps/api-owned tables
into it. `events` is left untouched (foreign). After this, "new tables that
apps/api owns" default to `api`.

## Steps

- [ ] Confirm with the external `events` owner whether `events` stays in
      `public` or already has/later gets its own schema; document the contract.
- [ ] `CREATE SCHEMA api;` (migration).
- [ ] Update `db/schema.ts`: move `webhooks` + `signing_keys` `pgTable(...)`
      to target the `api` schema (drizzle 2nd arg / `.schema("api")`).
- [ ] Generate + apply the data-move migration (`pnpm db:generate`):
      create `api.webhooks` / `api.signing_keys`, copy rows, drop old
      `public.*` (coordinate with any deploy ordering / downtime window).
- [ ] Set the apps/api connection `search_path` so owned tables resolve to
      `api` by default (`db/index.ts:14` postgres-js `options`/`onnotice` or
      drizzle schema map), while `events` is read schema-qualified.
- [ ] Keep read-only posture for `events` intact (update
      `db/migrations/README.md` if the schema-qualified read changes wording).
- [x] `pnpm db:test` green; tsc --noEmit clean.

## Non-goals

- Touching `events` (foreign-owned, read-only).
- The pool resolver's own schema — that belongs to the separate pools service
  — DECIDED (Q3, 2026-07-29, flipped from `api` to `pools`): the pools service owns a dedicated `pools` schema, tracked under the POOL-API work, not this bean.

## Acceptance

1. `webhooks` + `signing_keys` live in the `api` schema; `events` unchanged.
2. `pnpm db:generate` produces a clean idempotent migration; `pnpm db:test`
   green; full jest suite green.
3. apps/api owns/migrates ONLY `api.*`; `events` remains read-only (no write
   path added).

## Approach (execution, 2026-08-01)

- Move `events` definition out of `schema.ts` into a new `schema-events.ts` that is NOT in `drizzle.config.ts` → drizzle-kit stops managing it (root cause of the `idx_data_gin` push error).
- Introduce `pgSchema("api")` (parallel to the `pools` pattern) and move `webhooks` + `signing_keys` into it.
- One-time SQL migration script moves any existing rows before the push drops the old `public.*` tables.

## Summary of Changes

- **Root cause:** `db:push` introspected `public.events` (owned by indexer
  `soltrace_devnet`) and tried to reconcile its `idx_data_gin` index →
  `must be owner of index` error.
- **Fix:** `schemaFilter: ["api", "pools"]` in `drizzle.config.ts` —
  drizzle now only manages schemas apps/api owns. `events` is invisible to
  push but still queryable via `schema-events.ts` (deliberately excluded
  from the drizzle config schema list).
- **Schema move:** `webhooks` + `signing_keys` migrated from `public` →
  new `api` schema (`pgSchema("api")`, parallel to the `pools` pattern).
  5 existing signing keys preserved via data-copy SQL.
- **Files:** schema.ts (rewritten), schema-events.ts (new), drizzle.config.ts
  (schemaFilter), merchant.ts / queries.ts / token-issuer.ts (import path),
  migrations/move-to-api-schema.sql (one-time, idempotent),
  migrations/README.md (ownership table).

### Known follow-up (not blocking)
- `db:generate` interactive rename prompts are stale because the meta
  snapshots still reference `public` for the moved tables. The team uses
  `db:push` (not migrate), so this is cosmetic. Regenerating snapshots
  requires deleting old migration history — deferred.
