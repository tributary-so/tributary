/**
 * /v1/assets/* — proxy to tokens.xyz Assets API.
 *
 * See ADR-0028. Server injects `x-api-key`; the browser never sees it.
 * - GET /v1/assets/search?q=...&limit=...
 * - GET /v1/assets/resolve?mint=...
 *
 * Rate-limited per IP (120/min). Failure stance per ADR-0028 D3:
 *   search  on error → 200 with empty results
 *   resolve on error → 200 with baked-in override, or 404 if unknown
 */

import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware";
import { ipRateLimit } from "../middleware/rateLimit";
import { searchAssets, resolveAsset } from "../services/tokens-proxy";

const router: Router = Router();

// IP rate limit at the router level — applies to both /search and /resolve.
router.use(ipRateLimit({ windowMs: 60_000, maxRequests: 120 }));

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * @openapi
 * /v1/assets/search:
 *   get:
 *     summary: Search the tokenized-asset catalog
 *     description: >
 *       Server-side proxy to tokens.xyz `/assets/search`. Injects the
 *       upstream `x-api-key`; the browser never sees it. Returns a slim
 *       projection filtered to assets that carry a usable Solana SPL
 *       mint (no mint = no token account = no Tributary payment).
 *
 *       On upstream error, returns `200` with `results: []` (empty state,
 *       not error state). Redis-cached per-query for 60s. Rate-limited
 *       to 120 requests/min/IP.
 *     tags: [Assets]
 *     operationId: searchAssets
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 1, maxLength: 64 }
 *         description: Search query (symbol, name, or asset id).
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
 *                     results:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/AssetSearchResult' }
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
    if (!q) {
      res.status(400).json({
        success: false,
        error: "Query parameter 'q' is required",
        timestamp: Date.now(),
      });
      return;
    }
    const rawLimit = Number.parseInt(String(req.query.limit ?? "20"), 10);
    const limit = Number.isFinite(rawLimit) ? rawLimit : 20;

    const data = await searchAssets(q, limit);
    res.json({ success: true, data, timestamp: Date.now() });
  })
);

/**
 * @openapi
 * /v1/assets/resolve:
 *   get:
 *     summary: Resolve a mint to asset metadata
 *     description: >
 *       Server-side proxy to tokens.xyz `/assets/resolve`. Injects the
 *       upstream `x-api-key`. On upstream failure, falls back to the
 *       baked-in `MINT_OVERRIDES` map (USDC, SOL, USDT, mSOL, devnet
 *       USDC) so account balances never render as truncated mints.
 *
 *       Redis-cached per-mint for 10min. Rate-limited to 120/min/IP.
 *     tags: [Assets]
 *     operationId: resolveAsset
 *     parameters:
 *       - in: query
 *         name: mint
 *         required: true
 *         schema: { type: string, pattern: '^[1-9A-HJ-NP-Za-km-z]{32,44}$' }
 *         description: Solana base58 mint.
 *     responses:
 *       200:
 *         description: Asset metadata (upstream or fallback).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   required: [mint, assetId, symbol, name, decimals, imageUrl, category]
 *                   properties:
 *                     mint: { type: string, description: Solana base58 mint. }
 *                     assetId: { type: string, nullable: true }
 *                     symbol: { type: string, nullable: true, description: "Token symbol, or null when no source (tokens.xyz/venue/on-chain) provides one; clients render a fallback." }
 *                     name: { type: string, nullable: true }
 *                     decimals: { type: integer, nullable: true }
 *                     imageUrl: { type: string, format: uri, nullable: true }
 *                     category: { type: string, nullable: true }
 *                     tier: { type: string, nullable: true, description: tokens.xyz trust tier. }
 *                 timestamp: { type: integer }
 *       400:
 *         description: Missing or invalid mint parameter.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Mint unknown to upstream AND not in the fallback map.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get(
  "/resolve",
  asyncHandler(async (req: Request, res: Response) => {
    const mint =
      typeof req.query.mint === "string" ? req.query.mint.trim() : "";
    if (!BASE58_RE.test(mint)) {
      res.status(400).json({
        success: false,
        error:
          "Query parameter 'mint' must be a valid base58 mint (32-44 chars)",
        timestamp: Date.now(),
      });
      return;
    }
    const data = await resolveAsset(mint);
    if (!data) {
      res.status(404).json({
        success: false,
        error: "Mint not found and no fallback available",
        timestamp: Date.now(),
      });
      return;
    }
    res.json({ success: true, data, timestamp: Date.now() });
  })
);

export default router;
