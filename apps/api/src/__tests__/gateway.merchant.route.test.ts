// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import express, { Application } from "express";
import gatewayRouter from "../routes/gateway";
import { errorHandler } from "../middleware/errorHandler";

// Mock the merchant aggregations so we test the routes + auth wiring,
// not the SQL. The auth/verify path is mocked too — on-chain RPC and
// signature verification are integration concerns, not unit-test concerns.
jest.mock("../db/merchant");
jest.mock("../db/queries");
jest.mock("../services/gateway-auth");

import * as merchant from "../db/merchant";
import * as gatewayAuth from "../services/gateway-auth";
import * as queries from "../db/queries";

const mockedMerchant = merchant as jest.Mocked<typeof merchant>;
const mockedGatewayAuth = gatewayAuth as jest.Mocked<typeof gatewayAuth>;
const mockedQueries = queries as jest.Mocked<typeof queries>;

function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/v1/gateway", gatewayRouter);
  app.use(errorHandler);
  return app;
}

// A valid-looking gateway pubkey (just a 32-byte base58 string, length 44).
const GATEWAY = "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const BEARER_PREFIX = "Bearer ";

// Helper: build a fake verified JWT payload. The requireGatewayAuth middleware
// calls verifyToken (from middleware/auth), which in turn calls
// getSigningKeyByKid. To avoid JWKS plumbing, we mock verifyToken directly.
// We do this by intercepting the jose import — easier: mock the auth module.

jest.mock("../middleware/auth", () => {
  const actual = jest.requireActual("../middleware/auth");
  return {
    ...actual,
    verifyToken: jest.fn(),
  };
});

import { verifyToken } from "../middleware/auth";
const mockedVerifyToken = verifyToken as jest.MockedFunction<
  typeof verifyToken
>;

describe("Gateway merchant routes", () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe("POST /v1/gateway/:gateway/auth/challenge", () => {
    it("issues a nonce for a valid pubkey", async () => {
      mockedGatewayAuth.createChallenge.mockReturnValueOnce({
        nonce: "abc",
        gateway: GATEWAY,
        expiresAt: Date.now() + 60_000,
      });

      const res = await request(app)
        .post(`/v1/gateway/${GATEWAY}/auth/challenge`)
        .expect(200);

      expect(res.body.nonce).toBe("abc");
      expect(res.body.gateway).toBe(GATEWAY);
      expect(mockedGatewayAuth.createChallenge).toHaveBeenCalledWith(GATEWAY);
    });

    it("rejects an invalid pubkey shape", async () => {
      await request(app).post(`/v1/gateway/short/auth/challenge`).expect(400);
    });
  });

  describe("POST /v1/gateway/:gateway/auth/verify", () => {
    it("issues a token when authority verifies", async () => {
      mockedGatewayAuth.getChallenge.mockReturnValueOnce("nonce-bytes");
      mockedGatewayAuth.verifyGatewayAuthority.mockResolvedValueOnce({
        ok: true,
      });
      mockedGatewayAuth.issueGatewayToken.mockResolvedValueOnce({
        token: "jwt.string",
        expiresIn: 900,
      });

      const signature = new Array(64).fill(1);

      const res = await request(app)
        .post(`/v1/gateway/${GATEWAY}/auth/verify`)
        .send({ signer: GATEWAY, signature })
        .expect(200);

      expect(res.body.token).toBe("jwt.string");
      expect(mockedGatewayAuth.verifyGatewayAuthority).toHaveBeenCalledWith({
        gateway: GATEWAY,
        signer: GATEWAY,
        signature: expect.any(Uint8Array),
      });
    });

    it("returns 401 when signer is not the gateway authority", async () => {
      mockedGatewayAuth.getChallenge.mockReturnValueOnce("nonce-bytes");
      mockedGatewayAuth.verifyGatewayAuthority.mockResolvedValueOnce({
        ok: false,
        reason: "Signer is not the gateway authority",
      });

      const signature = new Array(64).fill(1);
      const res = await request(app)
        .post(`/v1/gateway/${GATEWAY}/auth/verify`)
        .send({ signer: GATEWAY, signature })
        .expect(401);

      expect(res.body.error).toContain("authority");
    });

    it("returns 401 when no challenge was issued", async () => {
      mockedGatewayAuth.getChallenge.mockReturnValueOnce(null);

      const signature = new Array(64).fill(1);
      const res = await request(app)
        .post(`/v1/gateway/${GATEWAY}/auth/verify`)
        .send({ signer: GATEWAY, signature })
        .expect(401);

      expect(res.body.error).toMatch(/challenge/i);
    });

    it("rejects malformed body", async () => {
      await request(app)
        .post(`/v1/gateway/${GATEWAY}/auth/verify`)
        .send({ signer: GATEWAY, signature: [1, 2, 3] })
        .expect(400);
    });
  });

  describe("GET /v1/gateway/:gateway/merchant/*", () => {
    beforeEach(() => {
      // Bypass JWT verification — return a payload carrying the gateway claim.
      mockedVerifyToken.mockResolvedValue({
        sub: GATEWAY,
        iss: "test",
        aud: "test",
        iat: 0,
        exp: 0,
        gateway: GATEWAY,
      } as any);
    });

    it("GET /policies returns paginated list", async () => {
      mockedMerchant.listMerchantPolicies.mockResolvedValueOnce({
        items: [
          {
            policyAddress: "policy-1",
            family: "regular",
            policyId: 0,
            recipient: "rec",
            userPayment: "up",
            variant: "Subscription",
            status: "Active",
            amount: "1000",
            paymentFrequency: "Monthly",
            createdAt: 1,
            paymentCount: 3,
            totalPaid: "3000",
            lastPaymentAt: 100,
          },
        ],
        total: 1,
      });

      const res = await request(app)
        .get(`/v1/gateway/${GATEWAY}/merchant/policies`)
        .set("Authorization", BEARER_PREFIX + "fake")
        .expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.items[0].policyAddress).toBe("policy-1");
    });

    it("GET /subscribers returns paginated wallets", async () => {
      mockedMerchant.listMerchantSubscribers.mockResolvedValueOnce({
        items: [
          {
            wallet: "w1",
            policyCount: 2,
            totalPaid: "500",
            lastActiveAt: 100,
          },
        ],
        total: 1,
      });

      const res = await request(app)
        .get(`/v1/gateway/${GATEWAY}/merchant/subscribers`)
        .set("Authorization", BEARER_PREFIX + "fake")
        .expect(200);

      expect(res.body.items[0].wallet).toBe("w1");
    });

    it("GET /revenue returns MRR + series", async () => {
      mockedMerchant.getMerchantRevenue.mockResolvedValueOnce({
        mrr: "1000",
        recognizedRevenue: "5000",
        activeSubscriptionCount: 1,
        series: [{ ts: "2024-01-01", mrr: "1000", recognized: "1000" }],
      });

      const res = await request(app)
        .get(`/v1/gateway/${GATEWAY}/merchant/revenue`)
        .set("Authorization", BEARER_PREFIX + "fake")
        .expect(200);

      expect(res.body.mrr).toBe("1000");
      expect(res.body.activeSubscriptionCount).toBe(1);
    });

    it("GET /export/policies?format=csv returns text/csv", async () => {
      mockedMerchant.listMerchantPolicies.mockResolvedValueOnce({
        items: [
          {
            policyAddress: "policy-1",
            family: "regular",
            policyId: 0,
            recipient: "rec",
            userPayment: "up",
            variant: "Subscription",
            status: "Active",
            amount: "1000",
            paymentFrequency: "Monthly",
            createdAt: 1,
            paymentCount: 0,
            totalPaid: "0",
            lastPaymentAt: null,
          },
        ],
        total: 1,
      });

      const res = await request(app)
        .get(`/v1/gateway/${GATEWAY}/merchant/export/policies?format=csv`)
        .set("Authorization", BEARER_PREFIX + "fake")
        .expect(200);

      expect(res.headers["content-type"]).toMatch(/text\/csv/);
      expect(res.text).toContain("policyAddress");
      expect(res.text).toContain("policy-1");
    });

    it("GET /export/payments?format=csv returns text/csv", async () => {
      mockedMerchant.listGatewayPayments.mockResolvedValueOnce([
        {
          signature: "sig-1",
          slot: 1,
          timestamp: new Date("2024-01-01"),
          data: { payment_policy: "p", gateway: GATEWAY, amount: 100 },
        },
      ]);

      const res = await request(app)
        .get(`/v1/gateway/${GATEWAY}/merchant/export/payments?format=csv`)
        .set("Authorization", BEARER_PREFIX + "fake")
        .expect(200);

      expect(res.headers["content-type"]).toMatch(/text\/csv/);
      expect(res.text).toContain("signature");
      expect(res.text).toContain("sig-1");
    });

    it("rejects request without Authorization header", async () => {
      await request(app)
        .get(`/v1/gateway/${GATEWAY}/merchant/policies`)
        .expect(401);
    });

    it("rejects JWT whose gateway claim does not match the route", async () => {
      mockedVerifyToken.mockResolvedValueOnce({
        sub: GATEWAY,
        iss: "test",
        aud: "test",
        iat: 0,
        exp: 0,
        gateway: "DifferentGatewayPubkeyxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      } as any);

      await request(app)
        .get(`/v1/gateway/${GATEWAY}/merchant/policies`)
        .set("Authorization", BEARER_PREFIX + "fake")
        .expect(403);
    });

    it("returns 404 for unknown export kind", async () => {
      const res = await request(app)
        .get(`/v1/gateway/${GATEWAY}/merchant/export/nope`)
        .set("Authorization", BEARER_PREFIX + "fake")
        .expect(404);

      expect(res.body.error).toMatch(/Unknown export kind/);
    });
  });
});
