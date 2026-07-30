/**
 * Unit tests for the /v1/pools route contract (bean tributary-ssvc wiring).
 *
 * The data layer (db/pools searchPools) is mocked at the module boundary; the
 * route's contract — envelope shape (tokenX/tokenY), query/venue validation,
 * and the empty-not-500 failure stance — is what these pin down. The live-PG
 * ranking/index behaviors live in pools-schema.integration.test.ts (xrn2).
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import express, { Application } from "express";

jest.mock("../db/pools", () => ({
  searchPools: jest.fn(),
}));

// Bypass IP rate limit so test runs aren't throttled.
jest.mock("../middleware/rateLimit", () => ({
  rateLimit: () => (_req: any, _res: any, next: any) => next(),
  walletRateLimit: () => (_req: any, _res: any, next: any) => next(),
  ipRateLimit: () => (_req: any, _res: any, next: any) => next(),
}));

import poolsRouter from "../routes/pools";
import { errorHandler } from "../middleware/errorHandler";
import * as poolsDb from "../db/pools";

const searchPools = poolsDb.searchPools as jest.MockedFunction<
  typeof poolsDb.searchPools
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
      searchPools.mockResolvedValueOnce([SAMPLE_HIT as any]);

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
      expect(searchPools).toHaveBeenCalledWith("SOL/USDC", {
        venue: "raydium",
        limit: 10,
      });
    });

    it("defaults limit to 20 when not provided", async () => {
      searchPools.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/pools/search?q=sol&venue=raydium")
        .expect(200);

      expect(searchPools).toHaveBeenCalledWith("sol", {
        venue: "raydium",
        limit: 20,
      });
    });

    it("returns 400 when q is missing", async () => {
      const res = await request(app).get("/v1/pools/search?venue=raydium");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/q.*required/i);
      expect(searchPools).not.toHaveBeenCalled();
    });

    it("returns 400 when venue is missing", async () => {
      const res = await request(app).get("/v1/pools/search?q=sol");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/venue.*required/i);
      expect(searchPools).not.toHaveBeenCalled();
    });

    it("returns 200 with empty results when searchPools throws (empty-not-500)", async () => {
      searchPools.mockRejectedValueOnce(new Error("db down"));

      const res = await request(app).get(
        "/v1/pools/search?q=sol&venue=raydium"
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toEqual([]);
    });

    it("returns 200 with empty results on a clean miss", async () => {
      searchPools.mockResolvedValueOnce([]);

      const res = await request(app).get(
        "/v1/pools/search?q=nope&venue=raydium"
      );

      expect(res.status).toBe(200);
      expect(res.body.data.results).toEqual([]);
    });
  });
});
