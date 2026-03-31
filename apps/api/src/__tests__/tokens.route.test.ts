// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import express, { Application } from "express";

jest.mock("../services/token-issuer", () => ({
  issueToken: jest.fn(),
  refreshToken: jest.fn(),
}));

jest.mock("../services/subscription", () => ({
  getSubscriptionDetails: jest.fn(),
}));

jest.mock("../services/jwks", () => ({
  getCurrentSigningKey: jest.fn(),
  getSigningKeyByKid: jest.fn(),
  importPrivateKey: jest.fn(),
}));

import tokensRouter from "../routes/tokens";
import { errorHandler } from "../middleware/errorHandler";
import * as tokenIssuer from "../services/token-issuer";

const mockIssueToken = tokenIssuer.issueToken as jest.Mock;
const mockRefreshToken = tokenIssuer.refreshToken as jest.Mock;

function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/v1/tokens", tokensRouter);
  app.use(errorHandler);
  return app;
}

describe("POST /v1/tokens/issue", () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  it("should issue a token with valid walletPublicKey", async () => {
    mockIssueToken.mockResolvedValueOnce({
      token: "jwt-token-abc",
      expiresAt: 1743469200,
    });

    const response = await request(app)
      .post("/v1/tokens/issue")
      .send({ walletPublicKey: "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR" })
      .expect(200);

    expect(response.body.token).toBeDefined();
    expect(response.body.expiresAt).toBeDefined();
    expect(mockIssueToken).toHaveBeenCalledWith(
      expect.objectContaining({
        walletPublicKey: "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR",
      })
    );
  });

  it("should return 400 for missing walletPublicKey", async () => {
    const response = await request(app)
      .post("/v1/tokens/issue")
      .send({})
      .expect(400);

    expect(response.body.error).toContain("walletPublicKey");
  });

  it("should return 400 for invalid walletPublicKey length", async () => {
    const response = await request(app)
      .post("/v1/tokens/issue")
      .send({ walletPublicKey: "short" })
      .expect(400);

    expect(response.body.error).toContain("walletPublicKey");
  });

  it("should return 400 for walletPublicKey too long", async () => {
    const response = await request(app)
      .post("/v1/tokens/issue")
      .send({ walletPublicKey: "a".repeat(50) })
      .expect(400);

    expect(response.body.error).toContain("walletPublicKey");
  });

  it("should pass optional tokenMint to issueToken", async () => {
    mockIssueToken.mockResolvedValueOnce({
      token: "jwt-token-abc",
      expiresAt: 1743469200,
    });

    await request(app)
      .post("/v1/tokens/issue")
      .send({
        walletPublicKey: "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR",
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      })
      .expect(200);
    expect(mockIssueToken).toHaveBeenCalledWith(
      expect.objectContaining({
        walletPublicKey: "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR",
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      })
    );
  });

  it("should pass optional policyAddress to issueToken", async () => {
    mockIssueToken.mockResolvedValueOnce({
      token: "jwt-token-abc",
      expiresAt: 1743469200,
    });

    await request(app)
      .post("/v1/tokens/issue")
      .send({
        walletPublicKey: "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR",
        policyAddress: "DxL3k...",
      })
      .expect(200);
    expect(mockIssueToken).toHaveBeenCalledWith(
      expect.objectContaining({
        walletPublicKey: "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR",
        policyAddress: "DxL3k...",
      })
    );
  });

  it("should handle service errors", async () => {
    mockIssueToken.mockRejectedValueOnce(
      new Error("Failed to read on-chain state")
    );

    const response = await request(app)
      .post("/v1/tokens/issue")
      .send({ walletPublicKey: "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR" })
      .expect(500);
  });

  describe("POST /v1/tokens/refresh", () => {
    it("should refresh an expired token", async () => {
      mockRefreshToken.mockResolvedValueOnce({
        token: "jwt-token-abc",
        expiresAt: 1746073200,
      });

      const response = await request(app)
        .post("/v1/tokens/refresh")
        .set("Authorization", "Bearer expired-jwt")
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.expiresAt).toBeDefined();
    });

    it("should return 401 for missing Authorization header", async () => {
      const response = await request(app)
        .post("/v1/tokens/refresh")
        .expect(401);

      expect(response.body.error).toContain("Missing Authorization header");
    });

    it("should return 401 for malformed Authorization header", async () => {
      const response = await request(app)
        .post("/v1/tokens/refresh")
        .set("Authorization", "NotBearer sometoken")
        .expect(401);

      expect(response.body.error).toContain("Missing Authorization header");
    });

    it("should handle service errors during refresh", async () => {
      mockRefreshToken.mockRejectedValueOnce(
        new Error("Failed to read on-chain state")
      );

      const response = await request(app)
        .post("/v1/tokens/refresh")
        .set("Authorization", "Bearer expired-jwt")
        .expect(500);

      expect(response.body.error).toBe("Failed to refresh token");
    });
  });
});
