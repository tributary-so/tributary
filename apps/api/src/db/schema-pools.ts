import {
  pgSchema,
  text,
  numeric,
  smallint,
  boolean,
  integer,
  jsonb,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

// Dedicated `pools` schema, owned + migrated by apps/api (milestone tributary-gq0p, Q3).
// Parallel to the `api`-side tables (webhooks / signing_keys); the foreign
// read-only `events` table is NOT touched here.
export const poolsSchema = pgSchema("pools");

export const pools = poolsSchema.table(
  "pools",
  {
    address: text("address").notNull(),
    venue: text("venue").notNull(),
    mintA: text("mint_a").notNull(),
    mintB: text("mint_b").notNull(),
    symbolA: text("symbol_a"),
    symbolB: text("symbol_b"),
    tvl: numeric("tvl").notNull(),
    feeRate: numeric("fee_rate"),
    stars: smallint("stars").notNull().default(0),
    tier1: boolean("tier1").notNull().default(false),
    extras: jsonb("extras").notNull().default({}),
    refreshedAt: timestamp("refreshed_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.venue, table.address] }),
    index("pools_symbol_a_idx").on(table.symbolA),
    index("pools_symbol_b_idx").on(table.symbolB),
    index("pools_mints_idx").on(table.mintA, table.mintB),
    index("pools_rank_idx").on(table.stars.desc(), table.tvl.desc()),
  ]
);

export const tokens = poolsSchema.table("tokens", {
  mint: text("mint").primaryKey(),
  known: boolean("known").notNull().default(false),
  tier: text("tier"),
  symbol: text("symbol"),
  name: text("name"),
  decimals: integer("decimals"),
  logoUri: text("logo_uri"),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }).notNull(),
});

export type Pool = typeof pools.$inferSelect;
export type NewPool = typeof pools.$inferInsert;
export type PoolToken = typeof tokens.$inferSelect;
export type NewPoolToken = typeof tokens.$inferInsert;
