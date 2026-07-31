/**
 * Integration test: `getMintsNeedingRefresh` (bean tributary-6p2p review).
 *
 * Closing a coverage gap surfaced in the pools-epic review: the stale-mint
 * query that feeds the star-precompute refresh is raw SQL via `db.execute`, and
 * was only mock-tested. This pins it against a live PG — distinct pooled mints,
 * the LEFT JOIN tokens cut (missing OR stale), and the `limit` cap.
 *
 * Needs a real database (`.integration.test.ts`); set POOLS_TEST_DATABASE_URL (or
 * DATABASE_URL) and run `pnpm test:integration`. Without a URL the suite skips.
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const TEST_URL =
  process.env.POOLS_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (TEST_URL) process.env.DATABASE_URL = TEST_URL;

import { getMintsNeedingRefresh, upsertPools, upsertToken } from "../db/pools";
import { getSyncDb, closeSyncDb } from "../services/pools-sync";
import { closeDb } from "../db";

const MIGRATIONS_DIR = join(__dirname, "..", "db", "migrations");

function loadPoolsMigration(): string {
  const file = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => ({ src: readFileSync(join(MIGRATIONS_DIR, f), "utf8") }))
    .find(({ src }) => src.includes(`CREATE SCHEMA "pools"`));
  if (!file) throw new Error("pools schema migration (0002) not found");
  return file.src;
}

const describeDb = TEST_URL ? describe : describe.skip;
const sql = TEST_URL ? postgres(TEST_URL!, { max: 1 }) : null!;

async function resetPoolsSchema(): Promise<void> {
  await sql!.unsafe(`DROP SCHEMA IF EXISTS "pools" CASCADE`);
  for (const stmt of loadPoolsMigration()
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean)) {
    await sql!.unsafe(stmt);
  }
}

describeDb("getMintsNeedingRefresh (live PG)", () => {
  beforeAll(async () => {
    await resetPoolsSchema();
    const db = getSyncDb();
    const now = new Date();
    // P1 = (mintA1, mintB1); P2 = (mintA1, mintB2). mintA1 appears on both.
    await upsertPools(db, [
      pool("P1", "mintA1", "mintB1", now),
      pool("P2", "mintA1", "mintB2", now),
    ]);
    // mintA1 gets a FRESH token row → must NOT need refresh.
    await upsertToken(db, {
      mint: "mintA1",
      known: true,
      refreshedAt: now,
    });
  });

  afterAll(async () => {
    await sql!.unsafe(`DROP SCHEMA IF EXISTS "pools" CASCADE`);
    await closeSyncDb();
    await closeDb();
    await sql!.end({ timeout: 5 });
  });

  it("returns distinct pooled mints that have no token row (mintA1 excluded)", async () => {
    const db = getSyncDb();
    const mints = await getMintsNeedingRefresh(db, {
      maxAgeMs: 60_000,
      limit: 100,
    });
    // mintA1 has a fresh row; mintB1 + mintB2 have none.
    expect([...mints].sort()).toEqual(["mintB1", "mintB2"]);
  });

  it("returns nothing once every mint has a fresh token row", async () => {
    const db = getSyncDb();
    const now = new Date();
    await upsertToken(db, { mint: "mintB1", known: false, refreshedAt: now });
    await upsertToken(db, { mint: "mintB2", known: false, refreshedAt: now });

    const mints = await getMintsNeedingRefresh(db, {
      maxAgeMs: 60_000,
      limit: 100,
    });
    expect(mints).toEqual([]);
  });

  it("re-includes a mint once its token row goes stale past the cutoff", async () => {
    const db = getSyncDb();
    // Push mintB1's refreshed_at well behind a 1s cutoff.
    await upsertToken(db, {
      mint: "mintB1",
      known: false,
      refreshedAt: new Date(Date.now() - 60_000),
    });

    const mints = await getMintsNeedingRefresh(db, {
      maxAgeMs: 1_000,
      limit: 100,
    });
    expect(mints).toContain("mintB1");
    expect(mints).not.toContain("mintA1");
  });

  it("honours the limit cap", async () => {
    const db = getSyncDb();
    const mints = await getMintsNeedingRefresh(db, {
      maxAgeMs: 1_000,
      limit: 1,
    });
    expect(mints.length).toBeLessThanOrEqual(1);
  });
});

function pool(address: string, mintA: string, mintB: string, now: Date) {
  return {
    address,
    venue: "raydium",
    mintA,
    mintB,
    symbolA: null,
    symbolB: null,
    tvl: "1",
    feeRate: null,
    stars: 0,
    tier1: false,
    extras: {},
    refreshedAt: now,
  };
}
