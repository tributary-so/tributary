// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import express, { Application } from "express";
import { errorHandler } from "../middleware/errorHandler";

jest.mock("@tributary-so/payments", () => ({}));
jest.mock("@tributary-so/sdk", () => ({}));
jest.mock("../services/subscription", () => ({
  getSubscriptionDetails: jest.fn(),
}));

import subscriptionRouter from "../routes/subscription";
import { getSubscriptionDetails } from "../services/subscription";

const mockGetSubscriptionDetails = getSubscriptionDetails as jest.Mock;

function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/v1/subscriptions", subscriptionRouter);
  app.use(errorHandler);
  return app;
}

describe("Subscription API Routes", () => {
  let app: Application;

  beforeEach(() => {
    mockGetSubscriptionDetails.mockReset();
    app = createApp();
  });

  describe("GET /v1/subscriptions", () => {
    it("should return subscription details with trackingId", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([
        {
          owner: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          recipient: "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          gateway: "7WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          policyId: 1,
          memo: "test_tracking_123",
          totalPaid: 1000000,
          createdAt: 1704067200,
          updatedAt: 1704067200,
          policyType: {
            subscription: {
              amount: 1000000,
              autoRenew: true,
              maxRenewals: null,
              paymentFrequency: { Monthly: null },
              nextPaymentDue: Date.now() / 1000 + 86400 * 30,
            },
          },
        },
      ]);

      const response = await request(app)
        .get("/v1/subscriptions")
        .query({ trackingId: "test_tracking_123" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0].memo).toBe("test_tracking_123");
      expect(response.body.timestamp).toBeDefined();
    });

    it("should return 404 when subscription not found", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/subscriptions")
        .query({ trackingId: "nonexistent" })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Subscription not found");
    });

    it("should accept userPublicKey parameter", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/subscriptions")
        .query({ userPublicKey: "user123" })
        .expect(404);

      expect(mockGetSubscriptionDetails).toHaveBeenCalledWith(
        expect.objectContaining({ userPublicKey: "user123" })
      );
    });

    it("should accept gatewayPublicKey parameter", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/subscriptions")
        .query({ gatewayPublicKey: "gateway123" })
        .expect(404);

      expect(mockGetSubscriptionDetails).toHaveBeenCalledWith(
        expect.objectContaining({ gatewayPublicKey: "gateway123" })
      );
    });

    it("should accept recipient parameter", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/subscriptions")
        .query({ recipient: "recipient123" })
        .expect(404);

      expect(mockGetSubscriptionDetails).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: "recipient123" })
      );
    });

    it("should accept walletPublicKey and tokenMint together", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/subscriptions")
        .query({
          walletPublicKey: "wallet123",
          tokenMint: "mint123",
        })
        .expect(404);

      expect(mockGetSubscriptionDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          walletPublicKey: "wallet123",
          tokenMint: "mint123",
        })
      );
    });

    it("should reject walletPublicKey without tokenMint", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/subscriptions")
        .query({ walletPublicKey: "wallet123" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("walletPublicKey or tokenMint");
    });

    it("should reject tokenMint without walletPublicKey", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/subscriptions")
        .query({ tokenMint: "mint123" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("walletPublicKey or tokenMint");
    });

    it("should reject request with no query parameters", async () => {
      const response = await request(app).get("/v1/subscriptions").expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Must specify one of");
    });

    it("should reject request with too many filters (>3)", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/subscriptions")
        .query({
          trackingId: "track123",
          userPublicKey: "user123",
          gatewayPublicKey: "gateway123",
          recipient: "recipient123",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Too many filters");
    });

    it("should accept exactly 3 filters", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/subscriptions")
        .query({
          trackingId: "track123",
          userPublicKey: "user123",
          gatewayPublicKey: "gateway123",
        })
        .expect(404);

      expect(mockGetSubscriptionDetails).toHaveBeenCalledWith({
        trackingId: "track123",
        userPublicKey: "user123",
        gatewayPublicKey: "gateway123",
      });
    });

    it("should handle service errors", async () => {
      mockGetSubscriptionDetails.mockRejectedValueOnce(
        new Error("Service error")
      );

      const response = await request(app)
        .get("/v1/subscriptions")
        .query({ trackingId: "error_test" })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Internal server error");
    });

    it("should return multiple subscriptions as array", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([
        {
          owner: "owner1",
          recipient: "recipient1",
          policyId: 1,
          memo: "test_tracking_456",
          totalPaid: 1000000,
          createdAt: 1704067200,
          updatedAt: 1704067200,
          policyType: { subscription: { amount: 1000000 } },
        },
        {
          owner: "owner2",
          recipient: "recipient2",
          policyId: 2,
          memo: "test_tracking_456",
          totalPaid: 2000000,
          createdAt: 1704067200,
          updatedAt: 1704067200,
          policyType: { subscription: { amount: 2000000 } },
        },
      ]);

      const response = await request(app)
        .get("/v1/subscriptions")
        .query({ trackingId: "test_tracking_456" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it("should handle special characters in trackingId", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([
        {
          owner: "owner1",
          memo: "test_tracking_special-123_ABC",
          policyId: 1,
        },
      ]);

      const response = await request(app)
        .get("/v1/subscriptions")
        .query({ trackingId: "test_tracking_special-123_ABC" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].memo).toBe("test_tracking_special-123_ABC");
    });

    it("should handle combined filters correctly", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/subscriptions")
        .query({
          gatewayPublicKey: "gateway123",
          recipient: "recipient123",
        })
        .expect(404);

      expect(mockGetSubscriptionDetails).toHaveBeenCalledWith({
        gatewayPublicKey: "gateway123",
        recipient: "recipient123",
      });
    });
  });
});
