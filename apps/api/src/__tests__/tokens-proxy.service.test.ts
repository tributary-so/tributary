/**
 * Unit tests for the tokens-proxy service — the layer that owns the
 * upstream fetch, Redis cache, and MINT_OVERRIDES fallback stance.
 *
 * Global `fetch` is mocked; the redis module is mocked so cache
 * misses/no-ops are deterministic.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
  afterEach,
} from "@jest/globals";

jest.mock("../services/redis", () => ({
  getRedisClient: jest.fn(async () => null),
  cacheGet: jest.fn(async () => null),
  cacheSet: jest.fn(async () => undefined),
}));

import { searchAssets, resolveAsset } from "../services/tokens-proxy";
import * as redis from "../services/redis";

const cacheGet = redis.cacheGet as jest.MockedFunction<typeof redis.cacheGet>;
const cacheSet = redis.cacheSet as jest.MockedFunction<typeof redis.cacheSet>;

const ORIGINAL_KEY = process.env.TOKENS_XYZ_API_KEY;
const ORIGINAL_BASE = process.env.TOKENS_XYZ_BASE_URL;

describe("tokens-proxy service", () => {
  beforeEach(() => {
    // clearAllMocks preserves factory-provided implementations (cacheGet→null).
    jest.clearAllMocks();
    process.env.TOKENS_XYZ_API_KEY = "test-key";
    process.env.TOKENS_XYZ_BASE_URL = "https://api.tokens.xyz/v1";
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.TOKENS_XYZ_API_KEY;
    else process.env.TOKENS_XYZ_API_KEY = ORIGINAL_KEY;
    if (ORIGINAL_BASE === undefined) delete process.env.TOKENS_XYZ_BASE_URL;
    else process.env.TOKENS_XYZ_BASE_URL = ORIGINAL_BASE;
  });

  describe("searchAssets", () => {
    it("returns empty results when the key is unset (upstream disabled)", async () => {
      delete process.env.TOKENS_XYZ_API_KEY;

      const result = await searchAssets("usdc", 10);

      expect(result).toEqual({ query: "usdc", results: [] });
      expect((global as any).fetch).not.toHaveBeenCalled();
    });

    it("returns empty results for a whitespace query without hitting upstream", async () => {
      const result = await searchAssets("   ", 10);

      expect(result).toEqual({ query: "", results: [] });
      expect((global as any).fetch).not.toHaveBeenCalled();
    });

    it("projects upstream results and filters assets without a usable mint", async () => {
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: "x",
          results: [
            {
              assetId: "good",
              symbol: "GOOD",
              name: "Good Token",
              category: "stablecoin",
              imageUrl: null,
              variants: [
                {
                  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                  decimals: 6,
                  kind: "native",
                  trustTier: "tier1",
                  primary: true,
                },
              ],
            },
            {
              assetId: "no-mint",
              symbol: "NOPE",
              name: "No Solana Mint",
              variants: [{ mint: "eth-only-address", decimals: 18 }],
            },
            {
              assetId: "no-variants",
              symbol: "EMPTY",
              name: "Empty Variants",
              variants: [],
            },
          ],
        }),
      });

      const result = await searchAssets("x", 20);

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toMatchObject({
        assetId: "good",
        symbol: "GOOD",
        primaryVariant: {
          mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          decimals: 6,
          kind: "native",
          trustTier: "tier1",
        },
      });
    });

    it("returns empty results on upstream HTTP error (empty-state stance)", async () => {
      (global as any).fetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await searchAssets("usdc", 10);

      expect(result).toEqual({ query: "usdc", results: [] });
    });

    it("returns empty results on upstream network error", async () => {
      (global as any).fetch.mockRejectedValueOnce(new Error("network down"));

      const result = await searchAssets("usdc", 10);

      expect(result).toEqual({ query: "usdc", results: [] });
    });

    it("serves cached results without hitting upstream", async () => {
      const cached = { query: "cached", results: [{ symbol: "CACHED" }] };
      cacheGet.mockResolvedValueOnce(cached);

      const result = await searchAssets("cached", 20);

      expect(result).toBe(cached);
      expect((global as any).fetch).not.toHaveBeenCalled();
    });

    it("writes fresh results to cache after a successful upstream call", async () => {
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      await searchAssets("fresh", 20);

      expect(cacheSet).toHaveBeenCalledWith(
        expect.stringContaining("tokens:search:fresh:20"),
        expect.any(Object),
        60
      );
    });

    it("injects x-api-key header on the upstream call", async () => {
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      await searchAssets("usdc", 5);

      const callArgs = (global as any).fetch.mock.calls[0];
      expect(callArgs[1].headers["x-api-key"]).toBe("test-key");
      expect(callArgs[0]).toContain("/assets/search?q=usdc&limit=5");
    });
  });

  describe("resolveAsset", () => {
    const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

    it("returns null for an invalid mint without hitting upstream", async () => {
      const result = await resolveAsset("not-a-real-mint");

      expect(result).toBeNull();
      expect((global as any).fetch).not.toHaveBeenCalled();
    });

    it("returns upstream data on success", async () => {
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mint: MINT,
          assetId: "usd",
          symbol: "USDC",
          name: "USD Coin",
          decimals: 6,
          imageUrl: null,
          category: "stablecoin",
        }),
      });

      const result = await resolveAsset(MINT);

      expect(result).toMatchObject({
        mint: MINT,
        symbol: "USDC",
        decimals: 6,
      });
    });

    it("falls back to MINT_OVERRIDES when upstream fails", async () => {
      (global as any).fetch.mockRejectedValueOnce(new Error("upstream down"));

      const result = await resolveAsset(MINT);

      expect(result).toMatchObject({
        mint: MINT,
        symbol: "USDC",
        decimals: 6,
      });
    });

    it("falls back to MINT_OVERRIDES for devnet USDC when upstream is unavailable", async () => {
      const devMint = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
      (global as any).fetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await resolveAsset(devMint);

      expect(result).toMatchObject({
        mint: devMint,
        symbol: "USDC (devnet)",
        decimals: 6,
      });
    });

    it("returns null when the mint is unknown to upstream AND not in overrides", async () => {
      const unknown = "11111111111111111111111111111111";
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        // Upstream returned a body but no symbol/name — treat as miss.
        json: async () => ({}),
      });

      const result = await resolveAsset(unknown);

      expect(result).toBeNull();
    });

    it("serves cached data without hitting upstream", async () => {
      const cached = { mint: MINT, symbol: "CACHED" };
      cacheGet.mockResolvedValueOnce(cached);

      const result = await resolveAsset(MINT);

      expect(result).toBe(cached);
      expect((global as any).fetch).not.toHaveBeenCalled();
    });
  });
});
