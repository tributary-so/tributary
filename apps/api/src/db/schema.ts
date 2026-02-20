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
