/**
 * Unit tests for the /v1/pools route contract (beans tributary-ssvc + g6uq).
 *
 * The cached search (services/pools-search) is mocked at the module boundary;
 * the route's contract — envelope shape (tokenX/tokenY), query validation,
 * optional venue, and the empty-not-500 failure stance — is what these pin
 * down. The live-PG ranking/index behaviors live in pools-schema.integration
 * .test.ts (xrn2); the cache behavior in pools-search.service.test.ts (g6uq).
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import express, { Application } from "express";

jest.mock("../services/pools-search", () => ({
  searchPoolsCached: jest.fn(),
}));

// Bypass IP rate limit so test runs aren't throttled.
jest.mock("../middleware/rateLimit", () => ({
  rateLimit: () => (_req: any, _res: any, next: any) => next(),
  walletRateLimit: () => (_req: any, _res: any, next: any) => next(),
  ipRateLimit: () => (_req: any, _res: any, next: any) => next(),
}));

import poolsRouter from "../routes/pools";
import { errorHandler } from "../middleware/errorHandler";
import * as poolsSearch from "../services/pools-search";

const searchPoolsCached = poolsSearch.searchPoolsCached as jest.MockedFunction<
  typeof poolsSearch.searchPoolsCached
>;

function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/v1/pools", poolsRouter);
  app.use(errorHandler);
  return app;
}

const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const SAMPLE_HIT = {
  pool: {
    address: "PoolABC",
    venue: "raydium",
    mintA: SOL,
    mintB: USDC,
    symbolA: "SOL",
    symbolB: "USDC",
    tvl: "5000",
    feeRate: "0.0025",
    stars: 2,
    tier1: true,
    extras: { ammConfig: "cfg1" },
    refreshedAt: new Date("2026-07-30T00:00:00Z"),
  },
  tokenA: {
    mint: SOL,
    known: true,
    tier: "tier1",
    symbol: "SOL",
    name: "Wrapped SOL",
    decimals: 9,
    logoUri: null,
    refreshedAt: new Date("2026-07-30T00:00:00Z"),
  },
  tokenB: {
    mint: USDC,
    known: true,
    tier: "tier1",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoUri: "https://img/usdc.png",
    refreshedAt: new Date("2026-07-30T00:00:00Z"),
  },
};

describe("/v1/pools routes", () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe("GET /v1/pools/search", () => {
    it("returns 200 with the ranked envelope, shaping tokenX/tokenY", async () => {
      searchPoolsCached.mockResolvedValueOnce([SAMPLE_HIT as any]);

      const res = await request(app).get(
        "/v1/pools/search?q=SOL/USDC&venue=raydium&limit=10"
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        query: "SOL/USDC",
        venue: "raydium",
      });
      const result = res.body.data.results[0];
      expect(result.address).toBe("PoolABC");
      expect(result.stars).toBe(2);
      expect(result.tier1).toBe(true);
      expect(result.tokenX).toMatchObject({
        mint: SOL,
        symbol: "SOL",
        decimals: 9,
        tier: "tier1",
      });
      expect(result.tokenY).toMatchObject({
        mint: USDC,
        symbol: "USDC",
        decimals: 6,
        logoUri: "https://img/usdc.png",
      });
      // §5 wire-type fix: numeric serialized as string by drizzle, but the
      // client contract is number — coerce at the route seam.
      expect(result.venue).toBe("raydium");
      expect(typeof result.tvl).toBe("number");
      expect(result.tvl).toBe(5000);
      expect(typeof result.feeRate).toBe("number");
      expect(result.feeRate).toBe(0.0025);
      expect(searchPoolsCached).toHaveBeenCalledWith("SOL/USDC", {
        venue: "raydium",
        limit: 10,
      });
    });

    it("defaults limit to 20 when not provided", async () => {
      searchPoolsCached.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/pools/search?q=sol&venue=raydium")
        .expect(200);

      expect(searchPoolsCached).toHaveBeenCalledWith("sol", {
        venue: "raydium",
        limit: 20,
      });
    });

    it("returns 400 when q is missing", async () => {
      const res = await request(app).get("/v1/pools/search?venue=raydium");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/q.*required/i);
      expect(searchPoolsCached).not.toHaveBeenCalled();
    });

    it("treats venue as optional — omitted searches all venues (200)", async () => {
      searchPoolsCached.mockResolvedValueOnce([]);

      const res = await request(app).get("/v1/pools/search?q=sol");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.venue).toBeNull();
      expect(searchPoolsCached).toHaveBeenCalledWith("sol", {
        venue: undefined,
        limit: 20,
      });
    });

    it("returns 200 with empty results when searchPoolsCached throws (empty-not-500)", async () => {
      searchPoolsCached.mockRejectedValueOnce(new Error("db down"));

      const res = await request(app).get(
        "/v1/pools/search?q=sol&venue=raydium"
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toEqual([]);
    });

    it("returns 200 with empty results on a clean miss", async () => {
      searchPoolsCached.mockResolvedValueOnce([]);

      const res = await request(app).get(
        "/v1/pools/search?q=nope&venue=raydium"
      );

      expect(res.status).toBe(200);
      expect(res.body.data.results).toEqual([]);
    });

    it("coerces null tvl/feeRate to null (not string), venue to PoolVenue (§5)", async () => {
      const nullFeeHit = {
        pool: {
          address: "PoolNull",
          venue: "meteora",
          mintA: SOL,
          mintB: USDC,
          symbolA: "SOL",
          symbolB: "USDC",
          tvl: null as unknown as string,
          feeRate: null,
          stars: 0,
          tier1: false,
          extras: {},
          refreshedAt: new Date("2026-07-30T00:00:00Z"),
        },
        tokenA: null,
        tokenB: null,
      };
      searchPoolsCached.mockResolvedValueOnce([nullFeeHit as any]);

      const res = await request(app).get(
        "/v1/pools/search?q=SOL&venue=meteora"
      );

      expect(res.status).toBe(200);
      const result = res.body.data.results[0];
      expect(result.venue).toBe("meteora");
      expect(result.tvl).toBeNull();
      expect(result.feeRate).toBeNull();
    });
  });
});
