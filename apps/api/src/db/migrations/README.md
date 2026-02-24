# Drizzle Migrations

This project connects to an existing, externally-managed PostgreSQL database in read-only mode. Therefore, **no migrations are run or maintained in this project**.

## Schema Definition

The schema in `src/db/schema.ts` reflects the existing database structure for the `events` table:

```typescript
export const events = pgTable("events", {
  id: bytea("id").primaryKey(),
  slot: bigint("slot", { mode: "number" }).notNull(),
  signature: text("signature").notNull(),
  eventName: text("event_name").notNull(),
  data: jsonb("data").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
});
```

## Important Notes

- Database schema changes must be made in the external database management system
- If the schema changes, update `src/db/schema.ts` to match
- This project only has read permissions to the database
- No tables are created, modified, or dropped by this application

## Verification

To verify the schema matches the database:

```bash
# Push schema to compare (dry-run, read-only won't allow writes)
pnpm drizzle-kit push
```

Note: This will fail with permission errors due to read-only access, which is expected.
