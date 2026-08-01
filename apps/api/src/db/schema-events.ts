// Foreign-owned table — the `events` table is created and populated by a
// separate indexer service (owner: `soltrace_devnet`). apps/api reads it only.
//
// This file is deliberately NOT listed in drizzle.config.ts so drizzle-kit
// never tries to create, alter, or drop it (the root cause of the old
// `must be owner of index idx_data_gin` push error). drizzle-orm (runtime)
// still uses this definition for typed queries — the config split only
// affects drizzle-kit's schema management.
import {
  pgTable,
  bigint,
  text,
  jsonb,
  timestamp,
  customType,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; notNull: true; default: false }>({
  dataType() {
    return "bytea";
  },
  toDriver(value: Buffer) {
    return value;
  },
  fromDriver(value: unknown) {
    if (typeof value === "string") {
      return Buffer.from(value, "base64");
    }
    return value as Buffer;
  },
});

export const events = pgTable("events", {
  id: bytea("id").primaryKey(),
  slot: bigint("slot", { mode: "number" }).notNull(),
  signature: text("signature").notNull(),
  eventName: text("event_name").notNull(),
  data: jsonb("data").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
