import {
  pgSchema,
  text,
  bigint,
  jsonb,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

// Dedicated `api` schema, owned + migrated by apps/api. Parallel to the
// `pools` schema (schema-pools.ts). The foreign read-only `events` table
// lives in schema-events.ts and is NOT managed by drizzle-kit.
export const apiSchema = pgSchema("api");

export const webhooks = apiSchema.table("webhooks", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  gatewayPubkey: text("gateway_pubkey").notNull(),
  endpointUrl: text("endpoint_url").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const signingKeys = apiSchema.table("signing_keys", {
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

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;
export type SigningKey = typeof signingKeys.$inferSelect;
export type NewSigningKey = typeof signingKeys.$inferInsert;
