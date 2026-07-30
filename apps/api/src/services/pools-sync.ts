/**
 * Pools sync/indexing service module (milestone tributary-gq0p).
 *
 * Owns the DEDICATED postgres pool — a separate `postgres()` instance from the
 * request `getDb()` (max: 1). The crawler shares this dedicated pool so it can
 * never starve request-serving (milestone REWRITTEN SCOPE, connection consequence).
 *
 * This module is the ORCHESTRATOR only:
 *  - a normalizer registry (venues register a full sync fn via
 *    `registerPoolNormalizer`),
 *  - a proactive ~5min interval that runs every registered normalizer with
 *    per-venue error isolation (one venue failing never stops the others).
 *
 * The venue-specific fetch+normalize (Raydium CLMM) and the tokens.xyz refresh
 * + star-precompute glue live in their own tasks (jh0p / podi) and register
 * here. Adding a venue = one `registerPoolNormalizer` call; no route or client
 * change.
 *
 * Booted in index.ts beside wsService / kafkaConsumer — same boot slot, but
 * proactive (interval) rather than reactive (websocket / kafka).
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as poolsSchema from "../db/schema-pools";

/** A venue normalizer performs a full sync tick: fetch → normalize → persist
 * (upsert pools, refresh touched tokens, recompute stars) using `getSyncDb()`. */
export type PoolNormalizer = () => Promise<void>;

export interface RegisteredNormalizer {
  venue: string;
  sync: PoolNormalizer;
}

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

let syncClient: postgres.Sql<Record<string, never>> | null = null;
let syncDb: ReturnType<typeof drizzle> | null = null;

const normalizers: RegisteredNormalizer[] = [];
let intervalHandle: NodeJS.Timeout | null = null;
let running = false;

/**
 * Dedicated drizzle handle for sync writes. Separate `postgres()` instance —
 * NOT the `getDb()` max:1 request client. Lazy singleton; null if no DATABASE_URL.
 */
export function getSyncDb(): ReturnType<typeof drizzle> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  if (!syncClient || !syncDb) {
    syncClient = postgres(process.env.DATABASE_URL, {
      // A few concurrent connections so a sync tick's upserts don't queue
      // behind each other; still bounded away from the request pool.
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    syncDb = drizzle(syncClient, { schema: poolsSchema, logger: false });
  }
  return syncDb;
}

/** Register a venue's full-sync function. Idempotent per venue. */
export function registerPoolNormalizer(
  venue: string,
  sync: PoolNormalizer,
): void {
  const existing = normalizers.find((n) => n.venue === venue);
  if (existing) {
    existing.sync = sync;
    return;
  }
  normalizers.push({ venue, sync });
}

/**
 * Run one sync tick across every registered venue. Per-venue error isolation:
 * a throwing normalizer is logged and skipped; the others still run.
 */
export async function runPoolsSyncTick(): Promise<void> {
  if (normalizers.length === 0) return;
  for (const { venue, sync } of normalizers) {
    try {
      await sync();
    } catch (err) {
      console.error(
        `[pools-sync] normalizer for venue "${venue}" failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

/**
 * Start the proactive sync loop. No-op if DATABASE_URL is unset (local dev
 * without a DB) or no normalizers are registered (nothing to sync yet — e.g.
 * before jh0p lands). Safe to call multiple times.
 */
export function startPoolsSync(intervalMs: number = DEFAULT_INTERVAL_MS): void {
  if (running) return;
  if (!process.env.DATABASE_URL) {
    console.log("[pools-sync] no DATABASE_URL, skipping sync loop");
    return;
  }
  if (normalizers.length === 0) {
    console.log("[pools-sync] no normalizers registered, skipping sync loop");
    return;
  }

  running = true;
  console.log(
    `[pools-sync] starting sync loop (${normalizers.length} venue(s), every ${
      intervalMs / 1000
    }s)`,
  );

  // Fire one tick shortly after boot (don't block startup), then on the interval.
  setTimeout(() => {
    runPoolsSyncTick().catch((err) =>
      console.error("[pools-sync] initial tick failed:", err),
    );
  }, 10_000);

  intervalHandle = setInterval(() => {
    runPoolsSyncTick().catch((err) =>
      console.error("[pools-sync] tick failed:", err),
    );
  }, intervalMs);
}

export function stopPoolsSync(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  running = false;
}

export async function closeSyncDb(): Promise<void> {
  if (syncClient) {
    await syncClient.end();
    syncClient = null;
    syncDb = null;
  }
}
