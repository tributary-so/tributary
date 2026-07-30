/**
 * Data layer for the `pools` schema (milestone tributary-gq0p).
 *
 * Two connection paths:
 *  - READ primitives (`searchPools`) use the request pool `getDb()` (max: 1) —
 *    search is request-served and short.
 *  - WRITE primitives take an explicit drizzle handle (`db`) so the caller
 *    chooses the pool. The sync service passes its DEDICATED pool
 *    (`getSyncDb()` in services/pools-sync.ts), so the crawler never serializes
 *    against request-serving (milestone REWRITTEN SCOPE, connection consequence).
 *
 * Ranking is `stars DESC NULLS LAST, tvl DESC NULLS LAST` — must match the
 * `pools_rank_idx` declaration (NULLS LAST) so the planner serves it via an
 * Index Scan, not a Sort (see pools-schema.integration.test.ts).
 */

import { and, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import { getDb } from ".";
import {
  pools,
  tokens,
  type Pool,
  type NewPool,
  type PoolToken,
  type NewPoolToken,
} from "./schema-pools";

/** A drizzle handle able to read+write the pools schema. */
export type PoolsDb = ReturnType<typeof drizzle>;

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// ---------------------------------------------------------------------------
// READ — free-text → ranked pools from the cached index.
// ---------------------------------------------------------------------------

export interface PoolSearchHit {
  pool: Pool;
  tokenA: PoolToken | null;
  tokenB: PoolToken | null;
}

/**
 * Split a free-text query into base58 mint/address candidates and symbol
 * candidates. Symbols are upper-cased for exact-case compare against the
 * indexed `symbol_a`/`symbol_b`. Raydium has no free-text upstream, so this
 * index parse IS the symbol-search feature (the original Mill UX bug).
 */
function parseTerms(raw: string): {
  mints: string[];
  symbols: string[];
} {
  const seen = new Set<string>();
  const mints: string[] = [];
  const symbols: string[] = [];
  for (const t of raw
    .split(/[\s/]+/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (BASE58_RE.test(t)) mints.push(t);
    else symbols.push(t.toUpperCase());
  }
  return { mints, symbols };
}

/**
 * Search the cached pools index. Empty (never throws) — callers wrap in their
 * own empty-not-500 posture for the HTTP layer; the data layer itself just
 * returns what the index has.
 */
export async function searchPools(
  query: string,
  opts: { venue: string; limit?: number }
): Promise<PoolSearchHit[]> {
  const db = getDb();
  if (!db) return [];

  const limit = Math.max(1, Math.min(50, opts.limit ?? 20));
  const { mints, symbols } = parseTerms(query.trim());
  if (mints.length === 0 && symbols.length === 0) return [];

  // alias for the second join onto the same `tokens` table.
  const tokenB = alias(tokens, "token_b");

  // A pool matches when a base58 candidate hits either mint leg or the pool
  // address (paste-mint/address escape hatch), OR the symbol candidates pair up
  // on (symbol_a, symbol_b) in either order, or a single symbol hits either leg.
  const mintConds = mints.flatMap((m) => [
    eq(pools.mintA, m),
    eq(pools.mintB, m),
    eq(pools.address, m),
  ]);
  const symConds = [];
  if (symbols.length >= 2) {
    const [s1, s2] = symbols;
    symConds.push(
      and(eq(pools.symbolA, s1), eq(pools.symbolB, s2)),
      and(eq(pools.symbolA, s2), eq(pools.symbolB, s1))
    );
  } else if (symbols.length === 1) {
    symConds.push(eq(pools.symbolA, symbols[0]), eq(pools.symbolB, symbols[0]));
  }

  const match = and(eq(pools.venue, opts.venue), or(...mintConds, ...symConds));

  const rows = await db
    .select({ pool: pools, tokenA: tokens, tokenB })
    .from(pools)
    .leftJoin(tokens, eq(tokens.mint, pools.mintA))
    .leftJoin(tokenB, eq(tokenB.mint, pools.mintB))
    .where(match)
    // NULLS LAST matches pools_rank_idx so the planner picks Index Scan.
    .orderBy(sql`${pools.stars} DESC NULLS LAST, ${pools.tvl} DESC NULLS LAST`)
    .limit(limit);

  return rows.map((r) => ({
    pool: r.pool,
    tokenA: r.tokenA,
    tokenB: r.tokenB,
  }));
}

export async function getPool(
  venue: string,
  address: string
): Promise<Pool | undefined> {
  const db = getDb();
  if (!db) return undefined;
  const [row] = await db
    .select()
    .from(pools)
    .where(and(eq(pools.venue, venue), eq(pools.address, address)))
    .limit(1);
  return row;
}

// ---------------------------------------------------------------------------
// WRITE — caller supplies the pool (sync service uses its dedicated pool).
// ---------------------------------------------------------------------------

/**
 * Idempotent bulk upsert. ON CONFLICT (venue, address) DO UPDATE — latest
 * values win. Safe to call every sync tick.
 */
export async function upsertPools(db: PoolsDb, rows: NewPool[]): Promise<void> {
  if (rows.length === 0) return;
  await db
    .insert(pools)
    .values(rows)
    .onConflictDoUpdate({
      target: [pools.venue, pools.address],
      set: {
        mintA: sql`excluded.mint_a`,
        mintB: sql`excluded.mint_b`,
        symbolA: sql`excluded.symbol_a`,
        symbolB: sql`excluded.symbol_b`,
        tvl: sql`excluded.tvl`,
        feeRate: sql`excluded.fee_rate`,
        stars: sql`excluded.stars`,
        tier1: sql`excluded.tier1`,
        extras: sql`excluded.extras`,
        refreshedAt: sql`excluded.refreshed_at`,
      },
    });
}

/**
 * Drain rows for a venue not refreshed since `cutoff` — the not-seen-in-N-sync
 * reconciliation (a pool that vanished upstream stops being served).
 */
export async function drainStalePools(
  db: PoolsDb,
  venue: string,
  cutoff: Date
): Promise<number> {
  const result = await db
    .delete(pools)
    .where(sql`${pools.venue} = ${venue} AND ${pools.refreshedAt} < ${cutoff}`)
    .returning({ address: pools.address });
  return result.length;
}

export async function upsertToken(
  db: PoolsDb,
  row: NewPoolToken
): Promise<void> {
  await db
    .insert(tokens)
    .values(row)
    .onConflictDoUpdate({
      target: tokens.mint,
      set: {
        known: sql`excluded.known`,
        tier: sql`excluded.tier`,
        symbol: sql`excluded.symbol`,
        name: sql`excluded.name`,
        decimals: sql`excluded.decimals`,
        logoUri: sql`excluded.logo_uri`,
        refreshedAt: sql`excluded.refreshed_at`,
      },
    });
}

export async function getToken(
  db: PoolsDb,
  mint: string
): Promise<PoolToken | undefined> {
  const [row] = await db
    .select()
    .from(tokens)
    .where(eq(tokens.mint, mint))
    .limit(1);
  return row;
}

/**
 * Distinct mints from the `pools` index that have NO fresh `tokens` row (missing
 * entirely, or `refreshed_at` older than the cutoff). Bounds the token-refresh
 * tick to only stale mints. Capped by `limit`.
 */
export async function getMintsNeedingRefresh(
  db: PoolsDb,
  opts: { maxAgeMs: number; limit?: number }
): Promise<string[]> {
  const cutoff = new Date(Date.now() - opts.maxAgeMs);
  const limit = opts.limit ?? 200;
  const rows = (await db.execute(sql`
    SELECT DISTINCT mint FROM (
      SELECT ${pools.mintA} AS mint FROM ${pools}
      UNION
      SELECT ${pools.mintB} AS mint FROM ${pools}
    ) m
    LEFT JOIN ${tokens} ON ${tokens.mint} = m.mint
    WHERE ${tokens.mint} IS NULL OR ${tokens.refreshedAt} < ${cutoff}
    LIMIT ${limit}
  `)) as unknown as Array<{ mint: string }>;
  return rows.map((r) => r.mint).filter(Boolean);
}

/**
 * Recompute `stars` + `tier1` for every pool touching `mint`, reading the live
 * `tokens` rows for both legs. Star precompute (milestone §4):
 *   stars = (a.known ? 1 : 0) + (b.known ? 1 : 0)   # 0|1|2
 *   tier1 = (a.tier = 'tier1') OR (b.tier = 'tier1')
 * Called by the token-refresher glue after a `tokens` row changes.
 */
export async function recomputeStarsForMint(
  db: PoolsDb,
  mint: string
): Promise<number> {
  const result = await db.execute(sql`
    UPDATE ${pools} SET
      stars = (
        COALESCE((SELECT known FROM ${tokens} WHERE mint = ${pools.mintA})::int, 0)
        + COALESCE((SELECT known FROM ${tokens} WHERE mint = ${pools.mintB})::int, 0)
      ),
      tier1 = (
        (SELECT tier FROM ${tokens} WHERE mint = ${pools.mintA}) = 'tier1'
        OR (SELECT tier FROM ${tokens} WHERE mint = ${pools.mintB}) = 'tier1'
      )
    WHERE ${pools.mintA} = ${mint} OR ${pools.mintB} = ${mint}
  `);
  // postgres-js returns a rowCount on the result.
  return (result as { rowCount?: number }).rowCount ?? 0;
}
