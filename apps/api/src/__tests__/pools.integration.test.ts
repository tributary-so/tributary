/**
 * Integration tests: pools search ranking + star precompute (bean tributary-xrn2).
 *
 * Covers the HANDOFF §6 test matrix that NEEDS a live Postgres — the ranking
 * (real 2★ pair above a same-symbol 0★ scam even when the scam has higher TVL),
 * the symbol-search bug fix, paste-mint find, and the star recompute trigger.
 * The failure-stance (empty-not-500) and TVL-floor drop are unit-covered
 * (pools.route.test.ts / raydium-sync.service.test.ts); this suite pins the
 * DB-level behaviors the index depends on.
 *
 * Needs a real database: excluded from the default `pnpm test` run
 * (`.integration.test.ts`). Set POOLS_TEST_DATABASE_URL (or DATABASE_URL) and
 * run `pnpm test:integration`. Without a URL the suite skips.
 *
 * Exercises the REAL data layer (searchPools / upsertPools / upsertToken /
 * recomputeStarsForMint) against the test DB — not raw SQL — so the actual
 * query/recompute code paths are validated.
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Point the app's lazy DB singletons (getDb / getSyncDb) at the test DB BEFORE
// any data-layer call. They read DATABASE_URL at first use, not import time.
const TEST_URL =
  process.env.POOLS_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (TEST_URL) process.env.DATABASE_URL = TEST_URL;

import {
  searchPools,
  upsertPools,
  upsertToken,
  recomputeStarsForMint,
} from "../db/pools";
import { getSyncDb, closeSyncDb } from "../services/pools-sync";
import { closeDb } from "../db";

const MIGRATIONS_DIR = join(__dirname, "..", "db", "migrations");

function loadPoolsMigration(): string {
  const file = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => ({ f, src: readFileSync(join(MIGRATIONS_DIR, f), "utf8") }))
    .find(({ src }) => src.includes(`CREATE SCHEMA "pools"`));
  if (!file) throw new Error("pools schema migration (0002) not found");
  return file.src;
}

const describeDb = TEST_URL ? describe : describe.skip;
const sql = TEST_URL ? postgres(TEST_URL!, { max: 1 }) : null!;

async function execStatements(ddl: string): Promise<void> {
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

const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SCAM_SOL = "ScamSOL111111111111111111111111111111111111";
const SCAM_USDC = "ScamUSD111111111111111111111111111111111111";

describeDb("pools search + star precompute (live PG)", () => {
  beforeAll(async () => {
    await resetPoolsSchema();
    const db = getSyncDb();
    const now = new Date();

    // Real SOL/USDC pool: 2★ (both mints known), LOWER tvl.
    // Same-symbol scam: 0★, HIGHER tvl — stars must still rank the real pair first.
    await upsertPools(db, [
      {
        address: "RealPool",
        venue: "raydium",
        mintA: SOL,
        mintB: USDC,
        symbolA: "SOL",
        symbolB: "USDC",
        tvl: "1000000",
        feeRate: "100",
        stars: 2,
        tier1: true,
        extras: {},
        refreshedAt: now,
      },
      {
        address: "ScamPool",
        venue: "raydium",
        mintA: SCAM_SOL,
        mintB: SCAM_USDC,
        symbolA: "SOL",
        symbolB: "USDC",
        tvl: "9000000", // 9x the real pool's TVL
        feeRate: "100",
        stars: 0,
        tier1: false,
        extras: {},
        refreshedAt: now,
      },
    ]);
    await sql!`ANALYZE "pools"."pools"`;
  });

  afterAll(async () => {
    await sql!.unsafe(`DROP SCHEMA IF EXISTS "pools" CASCADE`);
    await closeSyncDb();
    await closeDb();
    await sql!.end({ timeout: 5 });
  });

  it("ranks the real 2★ pair above a same-symbol 0★ scam even when the scam has higher TVL", async () => {
    const hits = await searchPools("SOL/USDC", { venue: "raydium", limit: 10 });
    const addresses = hits.map((h) => h.pool.address);
    expect(addresses).toContain("RealPool");
    expect(addresses).toContain("ScamPool");
    expect(addresses[0]).toBe("RealPool"); // stars (2 > 0) dominate TVL
  });

  it("returns results for a symbol query (the original Mill UX bug fix)", async () => {
    const hits = await searchPools("SOL", { venue: "raydium", limit: 10 });
    expect(hits.length).toBeGreaterThan(0);
    // both the real and scam pool carry symbol SOL on a leg
    expect(hits.map((h) => h.pool.address)).toEqual(
      expect.arrayContaining(["RealPool", "ScamPool"])
    );
  });

  it("finds pools when an arbitrary mint is pasted (paste-mint escape hatch)", async () => {
    const hits = await searchPools(SOL, { venue: "raydium", limit: 10 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].pool.mintA).toBe(SOL);
  });

  it("recomputes stars when a token's known flag changes", async () => {
    const db = getSyncDb();

    // Both legs known → recompute → RealPool should be 2★.
    await upsertToken(db, {
      mint: SOL,
      known: true,
      tier: "tier1",
      symbol: "SOL",
      name: "Wrapped SOL",
      decimals: 9,
      logoUri: null,
      refreshedAt: new Date(),
    });
    await upsertToken(db, {
      mint: USDC,
      known: true,
      tier: "tier1",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      logoUri: null,
      refreshedAt: new Date(),
    });
    await recomputeStarsForMint(db, SOL);
    await recomputeStarsForMint(db, USDC);

    const starsBothKnown = await poolStars("RealPool");
    expect(starsBothKnown).toBe(2);

    // Flip USDC to unknown → recompute its leg → RealPool drops to 1★.
    await upsertToken(db, {
      mint: USDC,
      known: false,
      tier: null,
      symbol: "USDC",
      name: null,
      decimals: null,
      logoUri: null,
      refreshedAt: new Date(),
    });
    await recomputeStarsForMint(db, USDC);

    expect(await poolStars("RealPool")).toBe(1);
  });

  async function poolStars(address: string): Promise<number> {
    const rows = await sql<{ stars: number }[]>`
      SELECT stars FROM "pools"."pools" WHERE address = ${address} AND venue = 'raydium'
    `;
    return rows[0]?.stars ?? -1;
  }
});
