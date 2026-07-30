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

import { searchPoolsCached } from "../services/pools-search";
import * as poolsDb from "../db/pools";
import * as redis from "../services/redis";

const searchPools = poolsDb.searchPools as jest.MockedFunction<
  typeof poolsDb.searchPools
>;
const cacheGet = redis.cacheGet as jest.MockedFunction<typeof redis.cacheGet>;
const cacheSet = redis.cacheSet as jest.MockedFunction<typeof redis.cacheSet>;

const HIT_A = [{ pool: { address: "A", venue: "raydium" } } as any];

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
});
