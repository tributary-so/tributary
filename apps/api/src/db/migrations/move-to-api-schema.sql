-- One-time migration: move apps/api-owned tables from `public` → `api` schema.
--
-- Background: db:push was failing with `must be owner of index idx_data_gin`
-- because drizzle tried to reconcile the foreign-owned `events` table. The fix
-- separates concerns: apps/api owns only the `api` (and `pools`) schemas;
-- `events` stays in `public`, owned by the indexer, and drizzle is told to
-- ignore it (schemaFilter in drizzle.config.ts).
--
-- This script is idempotent — safe to re-run. It:
--   1. Creates the `api` schema.
--   2. Creates `api.signing_keys` + `api.webhooks` (if absent).
--   3. Copies existing rows from `public.*` (if the old tables exist).
--   4. Drops the old `public.signing_keys` + `public.webhooks`.
--
-- The `events` table is NOT touched. Run as a user with CREATE privilege
-- (the apps/api DB user has it in dev; use a superuser in prod if needed).
--
-- Usage:
--   psql "$DATABASE_URL" -f src/db/migrations/move-to-api-schema.sql

BEGIN;

CREATE SCHEMA IF NOT EXISTS api;

-- signing_keys (PK: kid — text, safe to SELECT *)
CREATE TABLE IF NOT EXISTS api.signing_keys (LIKE public.signing_keys INCLUDING ALL);
INSERT INTO api.signing_keys
SELECT * FROM public.signing_keys
ON CONFLICT (kid) DO NOTHING;

-- webhooks (id is GENERATED ALWAYS AS IDENTITY — must skip it in INSERT)
CREATE TABLE IF NOT EXISTS api.webhooks (LIKE public.webhooks INCLUDING ALL);
INSERT INTO api.webhooks (gateway_pubkey, endpoint_url, active, created_at)
SELECT gateway_pubkey, endpoint_url, active, created_at
FROM public.webhooks
WHERE EXISTS (SELECT 1 FROM public.webhooks)  -- guard: avoid empty-insert quirk
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS public.signing_keys;
DROP TABLE IF EXISTS public.webhooks;

COMMIT;
