/**
 * /v1/pools/* — free-text pool search over the cached index.
 *
 * See milestone tributary-gq0p. GET /v1/pools/search?q=<free-text>&venue=...&
 * limit=... returns ranked REAL pools (stars DESC, tvl DESC) with token
 * identity. Raydium has no free-text upstream, so the index IS the feature.
 *
 * Rate-limited per IP (120/min). Failure stance (ADR-0028 D3): on error → 200
 * with empty results, never 500.
 *
 * NOTE: the Redis per-(q,venue,limit) cache + paste-mint singleton resolution
 * land in task tributary-g6uq; this is the wired baseline.
 */

import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware";
import { ipRateLimit } from "../middleware/rateLimit";
import { searchPoolsCached } from "../services/pools-search";
import type { PoolSearchHit } from "../db/pools";

// Mirrors @tributary-so/pools-client PoolVenue. Kept local (not imported) so the
// server never depends on its client package; the client is the wire contract.
type PoolVenue = "meteora" | "raydium" | "whirlpool";

const router: Router = Router();

// IP rate limit at the router level.
router.use(ipRateLimit({ windowMs: 60_000, maxRequests: 120 }));

interface PoolTokenLeg {
  mint: string;
  symbol: string | null;
  decimals: number | null;
  logoUri: string | null;
  tier: string | null;
}

interface PoolResult {
  address: string;
  venue: PoolVenue;
  tokenX: PoolTokenLeg;
  tokenY: PoolTokenLeg;
  tvl: number | null;
  feeRate: number | null;
  stars: number;
  tier1: boolean;
  extras: unknown;
}

function toLeg(
  mint: string,
  token: PoolSearchHit["tokenA"],
  fallbackSymbol: string | null
): PoolTokenLeg {
  return {
    mint,
    symbol: token?.symbol ?? fallbackSymbol,
    decimals: token?.decimals ?? null,
    logoUri: token?.logoUri ?? null,
    tier: token?.tier ?? null,
  };
}

function toResult(hit: PoolSearchHit): PoolResult {
  // Drizzle `numeric` serializes as string; the published client contract
  // (pools-client/types.ts) is number. Coerce at the seam so the wire shape
  // matches the client types (POOL-API §5 fix).
  const tvlRaw = hit.pool.tvl;
  const feeRaw = hit.pool.feeRate;
  return {
    address: hit.pool.address,
    venue: hit.pool.venue as PoolVenue,
    tokenX: toLeg(hit.pool.mintA, hit.tokenA, hit.pool.symbolA),
    tokenY: toLeg(hit.pool.mintB, hit.tokenB, hit.pool.symbolB),
    tvl: tvlRaw != null ? Number(tvlRaw) : null,
    feeRate: feeRaw != null ? Number(feeRaw) : null,
    stars: hit.pool.stars,
    tier1: hit.pool.tier1,
    extras: hit.pool.extras,
  };
}

/**
 * @openapi
 * /v1/pools/search:
 *   get:
 *     summary: Free-text search for liquidity pools
 *     description: >
 *       Searches the cached pool index (Raydium, Whirlpool, and the
 *       Meteora live proxy) by token symbol/name/mint. Returns ranked
 *       REAL pools (stars DESC, tvl DESC) with token identity, fees, and
 *       tier-1 trust flags. Used by the Mill to resolve a template's
 *       `lane` to a concrete pool address.
 *
 *       On error, returns `200` with `results: []` (ADR-0028 D3: empty,
 *       not 500). Redis-cached per (q, venue, limit). Rate-limited to
 *       120 requests/min/IP.
 *     tags: [Pools]
 *     operationId: searchPools
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 1, maxLength: 64 }
 *         description: Free-text query (symbol, name, or mint).
 *       - in: query
 *         name: venue
 *         required: false
 *         schema:
 *           type: string
 *           enum: [meteora, raydium, whirlpool]
 *         description: Restrict to one venue. Omit to search all venues.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *         description: Max results.
 *     responses:
 *       200:
 *         description: Search results (possibly empty).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     query: { type: string }
 *                     venue: { type: string, nullable: true }
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           address: { type: string, description: Pool base58 address. }
 *                           venue: { type: string, enum: [meteora, raydium, whirlpool] }
 *                           tokenX:
 *                             type: object
 *                             properties:
 *                               mint: { type: string }
 *                               symbol: { type: string, nullable: true }
 *                               decimals: { type: integer, nullable: true }
 *                               logoUri: { type: string, format: uri, nullable: true }
 *                               tier: { type: string, nullable: true, description: tokens.xyz trust tier. }
 *                           tokenY:
 *                             type: object
 *                             properties:
 *                               mint: { type: string }
 *                               symbol: { type: string, nullable: true }
 *                               decimals: { type: integer, nullable: true }
 *                               logoUri: { type: string, format: uri, nullable: true }
 *                               tier: { type: string, nullable: true }
 *                           tvl: { type: number, nullable: true, description: USD TVL. }
 *                           feeRate: { type: number, nullable: true }
 *                           stars: { type: integer, description: Trust ranking (0-5). }
 *                           tier1: { type: boolean, description: tokens.xyz tier-1 flag. }
 *                           extras: { type: object, description: Venue-specific payload. }
 *                 timestamp: { type: integer }
 *       400:
 *         description: Missing or invalid query parameter.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: IP rate limit exceeded.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get(
  "/search",
  asyncHandler(async (req: Request, res: Response) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const venue =
      typeof req.query.venue === "string" ? req.query.venue.trim() : "";
    if (!q) {
      res.status(400).json({
        success: false,
        error: "Query parameter 'q' is required",
        timestamp: Date.now(),
      });
      return;
    }
    // venue is optional — the Mill fixes it to template.lane; omitted searches
    // all venues.
    const rawLimit = Number.parseInt(String(req.query.limit ?? "20"), 10);
    const limit = Number.isFinite(rawLimit) ? rawLimit : 20;

    let results: PoolResult[] = [];
    try {
      const hits = await searchPoolsCached(q, {
        venue: venue || undefined,
        limit,
      });
      results = hits.map(toResult);
    } catch (err) {
      // ADR-0028 D3: empty, not 500.
      console.error(
        "[pools] search failed:",
        err instanceof Error ? err.message : err
      );
      results = [];
    }

    res.json({
      success: true,
      data: { query: q, venue: venue || null, results },
      timestamp: Date.now(),
    });
  })
);

export default router;
