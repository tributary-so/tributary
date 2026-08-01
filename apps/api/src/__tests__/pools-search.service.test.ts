/**
 * Unit tests for the cached pools search (bean tributary-g6uq).
 *
 * The data layer (searchPools) and the Redis cache (cacheGet/cacheSet) are
 * mocked at the module boundary. These pin the ~30s per-(venue, limit, query)
 * cache: a hit short-circuits the query; a miss queries then populates the
 * cache; cache keying varies by venue + limit + query.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.mock("../db/pools", () => ({
  searchPools: jest.fn(),
}));

jest.mock("../services/redis", () => ({
  cacheGet: jest.fn(),
  cacheSet: jest.fn(async () => undefined),
}));

jest.mock("../services/tokens-proxy", () => ({
  resolveAsset: jest.fn(),
}));

jest.mock("../services/pools-sync", () => ({
  getLiveResolver: jest.fn(() => undefined),
}));

import { searchPoolsCached } from "../services/pools-search";
import * as poolsDb from "../db/pools";
import * as redis from "../services/redis";
import * as tokensProxy from "../services/tokens-proxy";
import * as poolsSync from "../services/pools-sync";

const searchPools = poolsDb.searchPools as jest.MockedFunction<
  typeof poolsDb.searchPools
>;
const cacheGet = redis.cacheGet as jest.MockedFunction<typeof redis.cacheGet>;
const cacheSet = redis.cacheSet as jest.MockedFunction<typeof redis.cacheSet>;
const resolveAsset = tokensProxy.resolveAsset as jest.MockedFunction<
  typeof tokensProxy.resolveAsset
>;
const getLiveResolver = poolsSync.getLiveResolver as jest.MockedFunction<
  typeof poolsSync.getLiveResolver
>;

const HIT_A = [{ pool: { address: "A", venue: "raydium" } } as any];

// A real mainnet-length base58 mint (USDC) — exercises the singleton path.
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

describe("searchPoolsCached", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cacheGet.mockResolvedValue(null);
  });

  it("queries + populates the cache on a miss", async () => {
    searchPools.mockResolvedValueOnce(HIT_A);

    const out = await searchPoolsCached("SOL/USDC", {
      venue: "raydium",
      limit: 10,
    });

    expect(out).toBe(HIT_A);
    expect(searchPools).toHaveBeenCalledTimes(1);
    expect(searchPools).toHaveBeenCalledWith("SOL/USDC", {
      venue: "raydium",
      limit: 10,
    });
    expect(cacheSet).toHaveBeenCalledTimes(1);
    // ~30s TTL, per the data contract.
    expect(cacheSet).toHaveBeenCalledWith(
      expect.stringContaining("pools:search:raydium:10:SOL/USDC"),
      HIT_A,
      30
    );
  });

  it("short-circuits the DB query on a cache hit", async () => {
    cacheGet.mockResolvedValueOnce(HIT_A);

    const out = await searchPoolsCached("sol", { venue: "raydium" });

    expect(out).toBe(HIT_A);
    expect(searchPools).not.toHaveBeenCalled();
    expect(cacheSet).not.toHaveBeenCalled();
  });

  it("scopes the cache key by venue (omitted → 'all') and limit", async () => {
    searchPools.mockResolvedValue([]);

    await searchPoolsCached("sol", { venue: "raydium", limit: 20 });
    await searchPoolsCached("sol", { limit: 20 }); // no venue → all venues

    const keys = cacheSet.mock.calls.map((c) => c[0] as string);
    expect(keys).toContain("pools:search:raydium:20:sol");
    expect(keys).toContain("pools:search:all:20:sol");
  });

  it("passes venue:undefined through to searchPools when omitted", async () => {
    searchPools.mockResolvedValueOnce([]);

    await searchPoolsCached("sol", {});

    expect(searchPools).toHaveBeenCalledWith("sol", {
      venue: undefined,
      limit: 20,
    });
  });

  // --- live-proxy dispatch (POOL-API §3 — mode is server-internal) -----------
  describe("resolver-mode dispatch", () => {
    beforeEach(() => {
      getLiveResolver.mockReset();
      resolveAsset.mockReset();
    });

    it("routes a live-registered venue to its resolver (not the indexed DB)", async () => {
      const liveHit = [{ pool: { address: "L1", venue: "meteora" } } as any];
      const resolver = jest.fn(
        async (_q: string, _o: { limit: number }) => liveHit
      );
      getLiveResolver.mockReturnValueOnce(resolver);

      const out = await searchPoolsCached("SOL", {
        venue: "meteora",
        limit: 5,
      });

      expect(out).toBe(liveHit);
      expect(resolver).toHaveBeenCalledWith("SOL", { limit: 5 });
      expect(searchPools).not.toHaveBeenCalled(); // indexed path skipped
    });

    it("degrades a live-resolver throw to [] (empty-not-500)", async () => {
      const resolver = jest.fn(async (_q: string, _o: { limit: number }) => {
        throw new Error("meteora 503");
      });
      getLiveResolver.mockReturnValueOnce(resolver);

      const out = await searchPoolsCached("SOL", { venue: "meteora" });

      expect(out).toEqual([]);
      expect(searchPools).not.toHaveBeenCalled();
    });

    it("falls through to the indexed path when no live resolver is registered", async () => {
      getLiveResolver.mockReturnValueOnce(undefined); // raydium: indexed
      searchPools.mockResolvedValueOnce(HIT_A);

      const out = await searchPoolsCached("SOL", { venue: "raydium" });

      expect(out).toBe(HIT_A);
      expect(searchPools).toHaveBeenCalledWith("SOL", {
        venue: "raydium",
        limit: 20,
      });
    });

    it("singleton fallback fires on the live path too (mint in no live pool)", async () => {
      const resolver = jest.fn(async (_q: string, _o: { limit: number }) => []); // live returns nothing
      getLiveResolver.mockReturnValueOnce(resolver);
      resolveAsset.mockResolvedValueOnce({
        symbol: "USDC",
        tier: "tier1",
      } as any);

      const out = await searchPoolsCached(USDC, { venue: "meteora" });

      expect(out).toHaveLength(1);
      expect(out[0].pool.venue).toBe("meteora");
      expect((out[0].pool.extras as any).singleton).toBe(true);
      expect(resolveAsset).toHaveBeenCalledWith(USDC);
    });
  });

  // --- paste-mint singleton enrichment (POOL-API §6.4) ---------------------
  // A pasted base58 mint that matches NO indexed pool still returns a row:
  // its tokens.xyz identity, so the Mill row isn't blank. Only fires when a
  // venue is pinned (the Mill picker flow) — a venue-agnostic singleton has
  // no honest lane.
  describe("paste-mint singleton enrichment", () => {
    beforeEach(() => {
      resolveAsset.mockReset();
    });

    it("synthesizes a singleton identity row for an unindexed known mint + venue", async () => {
      searchPools.mockResolvedValueOnce([]);
      resolveAsset.mockResolvedValueOnce({
        mint: USDC,
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        imageUrl: "https://img/usdc.png",
        tier: "tier1",
        assetId: "usdc",
        category: "stable",
      } as any);

      const out = await searchPoolsCached(USDC, { venue: "meteora" });

      expect(out).toHaveLength(1);
      const hit = out[0];
      expect(hit.pool.address).toBe(USDC);
      expect(hit.pool.venue).toBe("meteora");
      expect(hit.pool.mintA).toBe(USDC);
      expect(hit.pool.stars).toBe(1); // single known leg
      expect(hit.pool.tier1).toBe(true);
      expect((hit.pool.extras as any).singleton).toBe(true);
      expect(hit.tokenA?.symbol).toBe("USDC");
      expect(resolveAsset).toHaveBeenCalledWith(USDC);
    });

    it("still returns a singleton (0★) when the mint is uncurated (resolveAsset null)", async () => {
      searchPools.mockResolvedValueOnce([]);
      resolveAsset.mockResolvedValueOnce(null);

      const out = await searchPoolsCached(USDC, { venue: "raydium" });

      expect(out).toHaveLength(1);
      expect(out[0].pool.stars).toBe(0);
      expect(out[0].pool.tier1).toBe(false);
      expect(out[0].tokenA).toBeNull();
      expect((out[0].pool.extras as any).singleton).toBe(true);
    });

    it("does NOT synthesize when venue is omitted (no honest lane)", async () => {
      searchPools.mockResolvedValueOnce([]);

      const out = await searchPoolsCached(USDC, {});

      expect(out).toEqual([]);
      expect(resolveAsset).not.toHaveBeenCalled();
    });

    it("does NOT synthesize when indexed pools matched (singleton is a fallback)", async () => {
      searchPools.mockResolvedValueOnce(HIT_A);

      const out = await searchPoolsCached(USDC, { venue: "raydium" });

      expect(out).toBe(HIT_A);
      expect(resolveAsset).not.toHaveBeenCalled();
    });

    it("does NOT synthesize for a non-mint (symbol) query", async () => {
      searchPools.mockResolvedValueOnce([]);

      const out = await searchPoolsCached("USDC", { venue: "raydium" });

      expect(out).toEqual([]);
      expect(resolveAsset).not.toHaveBeenCalled();
    });

    it("isolates a resolveAsset failure → returns [] (empty-not-500 posture)", async () => {
      searchPools.mockResolvedValueOnce([]);
      resolveAsset.mockRejectedValueOnce(new Error("tokens.xyz down"));

      const out = await searchPoolsCached(USDC, { venue: "raydium" });

      expect(out).toEqual([]);
    });
  });
});
