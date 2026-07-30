/**
 * Integration test: `pools` schema behaviors (bean tributary-ijuw).
 *
 * Verifies against a LIVE Postgres (the exact generated migration is applied to
 * an isolated `pools` schema), exercising the three properties the pools search
 * surface depends on:
 *   1. Idempotent upsert — ON CONFLICT (venue, address) DO UPDATE keeps one row
 *      per (venue, address), with the latest values winning.
 *   2. Drain-delete by TTL — rows whose refreshed_at falls outside the cutoff
 *      are removed; fresh rows survive (the not-seen-in-N sync reconciliation).
 *   3. Rank index usage — the search ORDER BY stars DESC, tvl DESC is served by
 *      the `pools_rank_idx` btree (not a re-sort over a seq scan).
 *
 * This needs a real database: it is excluded from the default `pnpm test` run
 * (`.integration.test.ts`). Set POOLS_TEST_DATABASE_URL (or DATABASE_URL) and run
 * `pnpm test:integration`. Without a URL the suite skips — no mock can prove
 * ON-CONFLICT or planner index selection.
 */
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DATABASE_URL =
  process.env.POOLS_TEST_DATABASE_URL ?? process.env.DATABASE_URL;

const MIGRATIONS_DIR = join(__dirname, "..", "db", "migrations");

function loadPoolsMigration(): string {
  const file = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => ({ f, src: readFileSync(join(MIGRATIONS_DIR, f), "utf8") }))
    .find(({ src }) => src.includes(`CREATE SCHEMA "pools"`));
  if (!file) throw new Error("pools schema migration (0002) not found");
  return file.src;
}

const describeDb = DATABASE_URL ? describe : describe.skip;
const sql = DATABASE_URL ? postgres(DATABASE_URL!, { max: 1 }) : null!;

async function execStatements(ddl: string): Promise<void> {
  // drizzle migrations separate statements with `--> statement-breakpoint`.
  for (const stmt of ddl
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean)) {
    await sql!.unsafe(stmt);
  }
}

async function resetPoolsSchema(): Promise<void> {
  await sql!.unsafe(`DROP SCHEMA IF EXISTS "pools" CASCADE`);
  await execStatements(loadPoolsMigration());
}

describeDb("pools schema behaviors (live PG)", () => {
  beforeAll(async () => {
    await resetPoolsSchema();
  });

  afterAll(async () => {
    // ponytail: clean up the test schema; leave the DB as we found it.
    await sql!.unsafe(`DROP SCHEMA IF EXISTS "pools" CASCADE`);
    await sql!.end({ timeout: 5 });
  });

  it("upsert is idempotent on (venue, address) — latest values win", async () => {
    // First write.
    await sql`
      INSERT INTO "pools"."pools"
        (address, venue, mint_a, mint_b, symbol_a, symbol_b, tvl, fee_rate, stars, tier1, extras, refreshed_at)
      VALUES
        ('PoolUpsert', 'raydium', 'So11111111111111111111111111111111111111112',
         'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'SOL', 'USDC',
         5000, 0.0025, 2, true, '{}'::jsonb, now())
      ON CONFLICT (venue, address) DO UPDATE
        SET tvl = EXCLUDED.tvl, refreshed_at = now()
    `;

    // Second write — same key, higher TVL.
    await sql`
      INSERT INTO "pools"."pools"
        (address, venue, mint_a, mint_b, symbol_a, symbol_b, tvl, fee_rate, stars, tier1, extras, refreshed_at)
      VALUES
        ('PoolUpsert', 'raydium', 'So11111111111111111111111111111111111111112',
         'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'SOL', 'USDC',
         9000, 0.0025, 2, true, '{}'::jsonb, now())
      ON CONFLICT (venue, address) DO UPDATE
        SET tvl = EXCLUDED.tvl, refreshed_at = now()
    `;

    const rows = await sql<{ c: number; tvl: string }[]>`
      SELECT count(*)::int AS c, tvl::text AS tvl FROM "pools"."pools"
      WHERE venue = 'raydium' AND address = 'PoolUpsert' GROUP BY tvl
    `;

    expect(rows.length).toBe(1); // exactly one row — no duplicate
    expect(rows[0].c).toBe(1);
    expect(rows[0].tvl).toBe("9000"); // latest value won
  });

  it("drain-delete removes stale rows past the TTL, keeps fresh ones", async () => {
    await sql`
      INSERT INTO "pools"."pools"
        (address, venue, mint_a, mint_b, tvl, stars, tier1, extras, refreshed_at)
      VALUES
        ('PoolFresh', 'meteora', 'mintF1', 'mintF2', 3000, 1, false, '{}'::jsonb, now()),
        ('PoolStale', 'meteora', 'mintS1', 'mintS2', 3000, 1, false, '{}'::jsonb, now() - interval '2 hours')
    `;

    // Drain: anything not seen in the last 30 minutes.
    const drained = await sql`
      DELETE FROM "pools"."pools"
      WHERE refreshed_at < now() - interval '30 minutes' RETURNING address
    `;

    expect(drained.map((r) => r.address)).toEqual(["PoolStale"]);

    const remaining = await sql<{ address: string }[]>`
      SELECT address FROM "pools"."pools" WHERE venue = 'meteora'
    `;
    expect(remaining.map((r) => r.address)).toEqual(["PoolFresh"]);
  });

  it("the rank index exists and serves the search ORDER BY stars DESC, tvl DESC", async () => {
    // (1) Catalog: the rank index exists with the expected key. This is the
    // bulletproof assertion — it survives any planner cost-model variance.
    const idx = await sql<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes
      WHERE schemaname = 'pools' AND indexname = 'pools_rank_idx'
    `;
    expect(idx.length).toBe(1);
    expect(idx[0].indexdef.toLowerCase()).toContain("stars desc");
    expect(idx[0].indexdef.toLowerCase()).toContain("tvl desc");

    // Seed a few hundred ranked rows so the planner has stats.
    await sql`
      INSERT INTO "pools"."pools"
        (address, venue, mint_a, mint_b, tvl, stars, tier1, extras, refreshed_at)
      SELECT
        'PoolRank' || gs,
        'raydium', 'mintA' || gs, 'mintB' || gs,
        (gs % 1000)::numeric, (gs % 3)::smallint, false, '{}'::jsonb, now()
      FROM generate_series(1, 200) AS gs
    `;
    await sql`ANALYZE "pools"."pools"`;

    // (2) Planner: the ranking query is served by `pools_rank_idx` (Index Scan,
    // no Sort). The index is declared NULLS LAST, so the search ORDER BY must
    // match that NULLS ordering for the planner to pick the index path — the
    // search route (services/pools search query) MUST emit NULLS LAST.
    const plan = await sql`
      EXPLAIN SELECT address FROM "pools"."pools"
      ORDER BY stars DESC NULLS LAST, tvl DESC NULLS LAST
      LIMIT 50
    `;
    // EXPLAIN's single column is "QUERY PLAN"; read it positionally.
    const planText = plan.map((r) => Object.values(r)[0] as string).join("\n");

    expect(planText).toContain("Index Scan");
    expect(planText).toContain("pools_rank_idx");
    expect(planText).not.toContain("Sort");
  });
});
