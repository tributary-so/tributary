/**
 * Cached pools search (bean tributary-g6uq).
 *
 * Thin Redis cache in front of `searchPools`, per ADR-0028 D3 posture + the
 * HANDOFF §2 data contract (Redis per-(q, venue, limit) cache ~30s). Reuses
 * apps/api's shared `redis.ts` (best-effort: no REDIS_URL → no cache, just the
 * underlying query). Empty-not-500 lives in the route; this layer never throws
 * either (cache errors are swallowed in redis.ts).
 */

import { cacheGet, cacheSet } from "./redis";
import { searchPools, type PoolSearchHit } from "../db/pools";

const CACHE_TTL = 30; // seconds

/**
 * Search pools with a ~30s Redis cache keyed by (venue, limit, query). A cache
 * hit short-circuits the DB query; a miss queries then populates the cache.
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

  const hits = await searchPools(q, { venue: opts.venue, limit });
  await cacheSet(cacheKey, hits, CACHE_TTL);
  return hits;
}
