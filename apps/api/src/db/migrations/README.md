# Database Migrations

## Schema ownership (three-way split)

apps/api shares a Postgres instance with two other data owners. Each owns a
dedicated schema; drizzle only manages the ones apps/api controls.

| Schema   | Owner                | Tables                     | Drizzle manages?   |
| -------- | -------------------- | -------------------------- | ------------------ |
| `api`    | apps/api             | `webhooks`, `signing_keys` | **Yes**            |
| `pools`  | apps/api (pool svc)  | `pools`, `tokens`          | **Yes**            |
| `public` | indexer (`soltrace`) | `events` (+ indexer's own) | **No** — read-only |

`drizzle.config.ts` sets `schemaFilter: ["api", "pools"]` so `db:push`
never introspects or reconciles `public.events`. The `events` table is still
queryable at runtime via the typed definition in `schema-events.ts` (kept
out of `drizzle.config.ts`'s schema list on purpose).

## Workflow

```bash
pnpm db:push      # apply schema changes (introspects api + pools only)
pnpm db:generate  # generate a SQL migration file (for the migrate workflow)
pnpm db:studio    # browse data
pnpm db:test      # smoke-test queries against the live DB
```

## One-time migration (already applied to devnet)

`migrations/move-to-api-schema.sql` moves `webhooks` + `signing_keys` from
`public` into the `api` schema, preserving rows. Run it once on any
environment that still has the tables in `public`. It is idempotent.

## Adding a new apps/api-owned table

1. Define it in `schema.ts` (or `schema-pools.ts`) using `apiSchema.table(...)`
   (or `poolsSchema.table(...)`).
2. `pnpm db:push` creates it.
3. If the table should be queryable but managed externally (like `events`),
   put its definition in a separate `schema-*.ts` file that is **not** listed
   in `drizzle.config.ts`.
