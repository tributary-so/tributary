// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import express, { Application } from "express";

jest.mock("../services/token-issuer", () => ({
  issueToken: jest.fn(),
}));

jest.mock("../services/subscription", () => ({
  getSubscriptionDetails: jest.fn(),
}));

jest.mock("../services/jwks", () => ({
  getCurrentSigningKey: jest.fn(),
  getSigningKeyByKid: jest.fn(),
  importPrivateKey: jest.fn(),
}));

jest.mock("../middleware/rateLimit", () => ({
  rateLimit: () => (req: any, res: any, next: any) => next(),
  walletRateLimit: () => (req: any, res: any, next: any) => next(),
}));

jest.mock("../db", () => ({
  getDb: jest.fn(() => ({})),
}));

import tokensRouter from "../routes/tokens";
import { errorHandler } from "../middleware/errorHandler";
import * as tokenIssuer from "../services/token-issuer";

const mockIssueToken = tokenIssuer.issueToken as jest.Mock;

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

  it("should pass optional recipient to issueToken", async () => {
    mockIssueToken.mockResolvedValueOnce({
      token: "jwt-token-abc",
      expiresAt: 1743469200,
    });

    await request(app)
      .post("/v1/tokens/issue")
      .send({
        walletPublicKey: "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR",
        recipient: "BxKpT3mZQ5HgeRZFMfWVBpDCmCN8eYwGmCjL7m9mVq",
      })
      .expect(200);
    expect(mockIssueToken).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: "BxKpT3mZQ5HgeRZFMfWVBpDCmCN8eYwGmCjL7m9mVq",
      })
    );
  });

  it("should pass optional transactionSignature to issueToken", async () => {
    const validSig =
      "nQokQxRXc5wmQbzUFsnpMEUxwAhM8rmeWrAhU56L6CNoYACSXsbrcup5g9aHfbe7b5XUKvcsMuvXfySst2JWdZi";
    mockIssueToken.mockResolvedValueOnce({
      token: "jwt-token-abc",
      expiresAt: 1743469200,
    });

    await request(app)
      .post("/v1/tokens/issue")
      .send({
        walletPublicKey: "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR",
        transactionSignature: validSig,
      })
      .expect(200);
    expect(mockIssueToken).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionSignature: validSig,
      })
    );
  });

  it("should return 400 for invalid transactionSignature format", async () => {
    const response = await request(app)
      .post("/v1/tokens/issue")
      .send({
        walletPublicKey: "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR",
        transactionSignature: "invalid-sig!!!",
      })
      .expect(400);

    expect(response.body.error).toContain("transactionSignature");
  });

  it("should return 404 when no policies found", async () => {
    mockIssueToken.mockRejectedValueOnce(
      new Error("No active subscription policies or payments found")
    );

    const response = await request(app)
      .post("/v1/tokens/issue")
      .send({ walletPublicKey: "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR" })
      .expect(404);

    expect(response.body.error).toContain("No active");
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
});
