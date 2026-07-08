/**
 * Integration tests for the /v1/assets proxy routes.
 *
 * Upstream fetch + Redis cache are mocked at the module boundary
 * (services/tokens-proxy). The route's contract — envelope shape,
 * query validation, failure stances, rate-limit passthrough — is what
 * these tests pin down.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import express, { Application } from "express";

jest.mock("../services/tokens-proxy", () => ({
  searchAssets: jest.fn(),
  resolveAsset: jest.fn(),
}));

// Bypass IP rate limit so test runs aren't throttled.
jest.mock("../middleware/rateLimit", () => ({
  rateLimit: () => (_req: any, _res: any, next: any) => next(),
  walletRateLimit: () => (_req: any, _res: any, next: any) => next(),
  ipRateLimit: () => (_req: any, _res: any, next: any) => next(),
}));

import assetsRouter from "../routes/assets";
import { errorHandler } from "../middleware/errorHandler";
import * as tokensProxy from "../services/tokens-proxy";

const searchAssets = tokensProxy.searchAssets as jest.MockedFunction<
  typeof tokensProxy.searchAssets
>;
const resolveAsset = tokensProxy.resolveAsset as jest.MockedFunction<
  typeof tokensProxy.resolveAsset
>;

function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/v1/assets", assetsRouter);
  app.use(errorHandler);
  return app;
}

const SAMPLE_RESULT = {
  assetId: "usd",
  symbol: "USDC",
  name: "USD Coin",
  category: "stablecoin",
  imageUrl: null,
  primaryVariant: {
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
    kind: "native",
    trustTier: "tier1",
  },
};

const SAMPLE_RESOLVE = {
  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  assetId: "usd",
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  imageUrl: null,
  category: "stablecoin",
};

describe("/v1/assets routes", () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe("GET /v1/assets/search", () => {
    it("returns 200 with the envelope + results on a happy upstream", async () => {
      searchAssets.mockResolvedValueOnce({
        query: "usdc",
        results: [SAMPLE_RESULT],
      });

      const res = await request(app).get("/v1/assets/search?q=usdc&limit=5");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        query: "usdc",
        results: [SAMPLE_RESULT],
      });
      expect(typeof res.body.timestamp).toBe("number");
      expect(searchAssets).toHaveBeenCalledWith("usdc", 5);
    });

    it("defaults limit to 20 when not provided", async () => {
      searchAssets.mockResolvedValueOnce({ query: "sol", results: [] });

      await request(app).get("/v1/assets/search?q=sol").expect(200);

      expect(searchAssets).toHaveBeenCalledWith("sol", 20);
    });

    it("returns 400 when q is missing", async () => {
      const res = await request(app).get("/v1/assets/search");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/q.*required/i);
      expect(searchAssets).not.toHaveBeenCalled();
    });

    it("returns 400 when q is whitespace-only", async () => {
      const res = await request(app).get("/v1/assets/search?q=%20%20");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(searchAssets).not.toHaveBeenCalled();
    });

    it("returns 200 with empty results when upstream yields none (empty-state stance)", async () => {
      searchAssets.mockResolvedValueOnce({ query: "zzz", results: [] });

      const res = await request(app).get("/v1/assets/search?q=zzz");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toEqual([]);
    });

    it("clamps non-finite limit back to 20 without erroring", async () => {
      searchAssets.mockResolvedValueOnce({ query: "x", results: [] });

      await request(app).get("/v1/assets/search?q=x&limit=NaN").expect(200);

      // The route passes 20 (the fallback) to the service; clamping to
      // [1,50] happens inside searchAssets.
      expect(searchAssets).toHaveBeenCalledWith("x", 20);
    });
  });

  describe("GET /v1/assets/resolve", () => {
    const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

    it("returns 200 with metadata on a happy upstream", async () => {
      resolveAsset.mockResolvedValueOnce(SAMPLE_RESOLVE);

      const res = await request(app).get(`/v1/assets/resolve?mint=${MINT}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        mint: MINT,
        symbol: "USDC",
        decimals: 6,
      });
      expect(resolveAsset).toHaveBeenCalledWith(MINT);
    });

    it("returns 400 when mint is missing", async () => {
      const res = await request(app).get("/v1/assets/resolve");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/mint.*base58/i);
      expect(resolveAsset).not.toHaveBeenCalled();
    });

    it("returns 400 when mint is not valid base58", async () => {
      const res = await request(app).get(
        "/v1/assets/resolve?mint=0OIl__not_base58"
      );

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(resolveAsset).not.toHaveBeenCalled();
    });

    it("returns 404 when the mint is unknown AND no fallback applies", async () => {
      const unknown = "11111111111111111111111111111111";
      resolveAsset.mockResolvedValueOnce(null);

      const res = await request(app).get(`/v1/assets/resolve?mint=${unknown}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/not found.*fallback/i);
    });

    it("returns 200 with override data when upstream falls back to MINT_OVERRIDES", async () => {
      // The service layer is mocked, so we simulate the fallback shape
      // it produces: resolveAsset returns the override-derived payload.
      resolveAsset.mockResolvedValueOnce({
        mint: MINT,
        assetId: null,
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        imageUrl: null,
        category: "native",
      });

      const res = await request(app).get(`/v1/assets/resolve?mint=${MINT}`);

      expect(res.status).toBe(200);
      expect(res.body.data.symbol).toBe("USDC");
      expect(res.body.data.decimals).toBe(6);
    });
  });

  describe("rejects unsupported methods", () => {
    it("POST /v1/assets/search → 404", async () => {
      await request(app).post("/v1/assets/search?q=x").expect(404);
    });
  });
});
