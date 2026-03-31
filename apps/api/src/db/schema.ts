import {
  pgTable,
  bigint,
  text,
  jsonb,
  timestamp,
  boolean,
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

export const webhooks = pgTable("webhooks", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  gatewayPubkey: text("gateway_pubkey").notNull(),
  endpointUrl: text("endpoint_url").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const signingKeys = pgTable("signing_keys", {
  kid: text("kid").primaryKey(),
  privateKey: text("private_key").notNull(),
  publicJwk: jsonb("public_jwk").notNull(),
  algorithm: text("algorithm").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  rotatedAt: timestamp("rotated_at", { withTimezone: true }),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;
export type SigningKey = typeof signingKeys.$inferSelect;
export type NewSigningKey = typeof signingKeys.$inferInsert;
