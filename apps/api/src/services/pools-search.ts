/**
 * Cached pools search (bean tributary-g6uq).
 *
 * Dispatches by resolver mode (POOL-API §3 — client-invisible):
 *  - **live-proxy** venues (own free-text → Meteora): a registered live resolver
 *    answers per query, trust-joining inline. No index.
 *  - **indexed** venues (no free-text → Raydium, Whirlpool): `searchPools` off
 *    the cached `pools` table.
 * Then the paste-mint singleton fallback (§6.4) and the ~30s Redis cache apply
 * to BOTH paths. Empty-not-500 lives in the route; this layer never throws
 * either (cache errors are swallowed in redis.ts).
 *
 * Paste-mint singleton enrichment (§6.4): a pasted base58 mint that matches NO
 * pool (either path) still returns one row — its tokens.xyz identity — so the
 * Mill row isn't blank. Only fires when a venue is pinned (the Mill picker
 * flow): a venue-agnostic singleton has no honest lane.
 */

import { cacheGet, cacheSet } from "./redis";
import { searchPools, type PoolSearchHit } from "../db/pools";
import { getLiveResolver } from "./pools-sync";
import { resolveAsset } from "./tokens-proxy";
import { describeError } from "./errors";

const CACHE_TTL = 30; // seconds

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Search pools with a ~30s Redis cache keyed by (venue, limit, query). Dispatches
 * to the live-proxy resolver when one is registered for the venue, else the
 * indexed `searchPools`. On an empty result for a single pasted mint + pinned
 * venue, falls back to a tokens.xyz singleton identity row.
 */
export async function searchPoolsCached(
  query: string,
  opts: { venue?: string; limit?: number }
): Promise<PoolSearchHit[]> {
  const limit = Math.max(1, Math.min(50, opts.limit ?? 20));
  const venueKey = opts.venue && opts.venue.length > 0 ? opts.venue : "all";
  const q = query.trim();
  const cacheKey = `pools:search:${venueKey}:${limit}:${q}`;

  const cached = await cacheGet<PoolSearchHit[]>(cacheKey);
  if (cached) return cached;

  // Dispatch: live-proxy resolver for the venue, else indexed DB search.
  const venue = opts.venue && opts.venue.length > 0 ? opts.venue : undefined;
  const liveResolver = venue ? getLiveResolver(venue) : undefined;
  let hits: PoolSearchHit[];
  if (liveResolver) {
    try {
      hits = await liveResolver(q, { limit });
    } catch (err) {
      // Live upstream failure → degrade to empty (the route applies empty-not-500).
      console.warn("[pools-search] live resolver failed:", describeError(err));
      hits = [];
    }
  } else {
    hits = await searchPools(q, { venue, limit });
  }

  // §6.4 fallback: a lone unindexed pasted mint, in a pinned lane, resolves to
  // a singleton identity row so the Mill picker isn't blank. Applies after both
  // the live and indexed paths. The mint still has to BE a mint (base58).
  const enriched =
    hits.length === 0 && venue && BASE58_RE.test(q)
      ? await singletonHit(q, venue)
      : hits;

  await cacheSet(cacheKey, enriched, CACHE_TTL);
  return enriched;
}

/**
 * Resolve a pasted mint's tokens.xyz identity and synthesize a singleton
 * `PoolSearchHit`. `address` = the mint (no real pool account exists; the mint
 * is the stable unique key). `extras.singleton = true` flags it for the client.
 * `stars` follows the single-leg model (1 if known, else 0). Isolated: a
 * resolveAsset failure yields `[]` (the empty-not-500 posture).
 */
async function singletonHit(
  mint: string,
  venue: string
): Promise<PoolSearchHit[]> {
  let asset;
  try {
    asset = await resolveAsset(mint);
  } catch (err) {
    console.warn(
      "[pools-search] singleton resolveAsset failed:",
      describeError(err)
    );
    return [];
  }
  const now = new Date();
  return [
    {
      pool: {
        address: mint,
        venue,
        mintA: mint,
        mintB: "",
        symbolA: asset?.symbol ?? null,
        symbolB: null,
        tvl: "0",
        feeRate: null,
        stars: asset ? 1 : 0,
        tier1: asset?.tier === "tier1",
        extras: { singleton: true },
        refreshedAt: now,
      },
      tokenA: asset
        ? {
            mint,
            known: true,
            tier: asset.tier ?? null,
            symbol: asset.symbol ?? null,
            name: asset.name ?? null,
            decimals: asset.decimals ?? null,
            logoUri: asset.imageUrl ?? null,
            refreshedAt: now,
          }
        : null,
      tokenB: null,
    },
  ];
}
