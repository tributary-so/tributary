import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import express, { Application } from "express";
import { errorHandler } from "../middleware/errorHandler";

// Module mocks. The route talks to: the subscription service (list), the SDK
// (single fetch via Tributary.program), and db queries (executions).
jest.mock("../services/subscription", () => ({
  getSubscriptionDetails: jest.fn(),
  SubscriptionDetails: {},
}));
jest.mock("../services/solana", () => ({
  getConnection: jest.fn(() => ({})),
}));
jest.mock("@tributary-so/payments", () => ({
  PaymentTracker: jest.fn(),
  PolicyLookupOptions: {},
}));
const fetchNullableMock: jest.MockedFunction<any> = jest.fn() as any;
jest.mock("@tributary-so/sdk", () => ({
  Tributary: jest.fn(() => ({
    program: {
      account: { paymentPolicy: { fetchNullable: fetchNullableMock } },
    },
  })),
  decodeMemo: jest.fn((buf: number[]) =>
    String.fromCharCode(...buf)
      .replace(/\0/g, "")
      .trim()
  ),
  PaymentPolicy: {},
}));
jest.mock("../db/queries", () => ({
  getPaymentExecutionsByPolicyAddress: jest.fn(),
}));

import paymentPoliciesRouter from "../routes/payment-policies";
import { getSubscriptionDetails } from "../services/subscription";
import { getPaymentExecutionsByPolicyAddress } from "../db/queries";

const mockGetSubscriptionDetails =
  getSubscriptionDetails as jest.MockedFunction<any>;
const mockGetPaymentExecutions =
  getPaymentExecutionsByPolicyAddress as jest.MockedFunction<any>;

function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/v1/payment-policies", paymentPoliciesRouter);
  app.use(errorHandler);
  return app;
}

const NORMALIZED_POLICY = {
  owner: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  recipient: "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  gateway: "7WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  policyId: 1,
  memo: "test_tracking_123",
  totalPaid: 1000000,
  createdAt: 1704067200,
  updatedAt: 1704067200,
  policyAccount: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  policyType: { subscription: { amount: 1000000 } },
};

describe("Payment Policies API Routes", () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe("GET /v1/payment-policies (list)", () => {
    it("returns policies with a single filter", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([NORMALIZED_POLICY]);

      const response = await request(app)
        .get("/v1/payment-policies")
        .query({ trackingId: "test_tracking_123" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0].memo).toBe("test_tracking_123");
      expect(response.body.timestamp).toBeDefined();
    });

    it("returns 404 when no policy matches", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/payment-policies")
        .query({ trackingId: "nonexistent" })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Payment policy not found");
    });

    it("forwards filter options to the service", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/payment-policies")
        .query({ gatewayPublicKey: "gateway123" })
        .expect(404);

      expect(mockGetSubscriptionDetails).toHaveBeenCalledWith(
        expect.objectContaining({ gatewayPublicKey: "gateway123" })
      );
    });

    it("accepts walletPublicKey + tokenMint paired", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/payment-policies")
        .query({ walletPublicKey: "wallet123", tokenMint: "mint123" })
        .expect(404);

      expect(mockGetSubscriptionDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          walletPublicKey: "wallet123",
          tokenMint: "mint123",
        })
      );
    });

    it("rejects walletPublicKey without tokenMint", async () => {
      const response = await request(app)
        .get("/v1/payment-policies")
        .query({ walletPublicKey: "wallet123" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("walletPublicKey or tokenMint");
    });

    it("rejects tokenMint without walletPublicKey", async () => {
      const response = await request(app)
        .get("/v1/payment-policies")
        .query({ tokenMint: "mint123" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("walletPublicKey or tokenMint");
    });

    it("rejects request with no filters", async () => {
      const response = await request(app)
        .get("/v1/payment-policies")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Must specify one of");
    });

    it("rejects more than 3 filters", async () => {
      const response = await request(app)
        .get("/v1/payment-policies")
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

    it("accepts exactly 3 filters", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/payment-policies")
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
  });

  describe("GET /v1/payment-policies/:address (single)", () => {
    it("returns a normalized policy when the account exists", async () => {
      fetchNullableMock.mockResolvedValueOnce({
        owner: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        recipient: "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        gateway: "7WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        policyId: 1,
        memo: Array.from("test_tracking_123").map((c) => c.charCodeAt(0)),
        totalPaid: { toNumber: () => 1000000 },
        createdAt: { toNumber: () => 1704067200 },
        updatedAt: { toNumber: () => 1704067200 },
        policyType: {
          subscription: { amount: 1000000, padding: new Uint8Array(0) },
        },
        padding: new Uint8Array(0),
        bump: 255,
      });

      const response = await request(app)
        .get(
          "/v1/payment-policies/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
        )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.memo).toBe("test_tracking_123");
      expect(response.body.data.totalPaid).toBe(1000000);
      expect(
        response.body.data.policyType.subscription.padding
      ).toBeUndefined();
    });

    it("returns 404 when the account does not exist", async () => {
      fetchNullableMock.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(
          "/v1/payment-policies/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
        )
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Payment policy not found");
    });
  });

  describe("GET /v1/payment-policies/:address/executions", () => {
    it("returns execution records via getPaymentExecutionsByPolicyAddress", async () => {
      mockGetPaymentExecutions.mockResolvedValueOnce([
        {
          id: 1,
          signature: "5Kq3...mock",
          slot: 123,
          timestamp: new Date("2024-01-01T00:00:00Z"),
          eventName: "tributary_PaymentRecord",
          data: { amount: 1000000, payment_policy: "addr" },
        },
      ]);

      const response = await request(app)
        .get(
          "/v1/payment-policies/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/executions"
        )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(mockGetPaymentExecutions).toHaveBeenCalledWith(
        "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        expect.objectContaining({ limit: undefined, offset: undefined })
      );
    });

    it("passes through pagination params", async () => {
      mockGetPaymentExecutions.mockResolvedValueOnce([]);

      await request(app)
        .get(
          "/v1/payment-policies/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/executions"
        )
        .query({ limit: 5, offset: 10 })
        .expect(200);

      expect(mockGetPaymentExecutions).toHaveBeenCalledWith(
        "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        expect.objectContaining({ limit: 5, offset: 10 })
      );
    });

    it("defaults limit/offset when omitted", async () => {
      mockGetPaymentExecutions.mockResolvedValueOnce([]);

      await request(app)
        .get(
          "/v1/payment-policies/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/executions"
        )
        .expect(200);

      expect(mockGetPaymentExecutions).toHaveBeenCalledWith(
        "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        { limit: undefined, offset: undefined }
      );
    });
  });

  /**
   * Shape parity: /payment-policies is the canonical name for the data that
   * /subscriptions serves. Both delegate to getSubscriptionDetails, so the
   * response envelope + record shape must be identical. This locks the
   * contract so a future refactor of one endpoint can't silently drift.
   */
  describe("Shape parity with /subscriptions", () => {
    const SUBSCRIPTION_SHAPED_RECORD = {
      owner: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      recipient: "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      gateway: "7WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      policyId: 1,
      memo: "shape_parity_check",
      totalPaid: 1000000,
      createdAt: 1704067200,
      updatedAt: 1704067200,
      policyAccount: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      policyType: { subscription: { amount: 1000000 } },
    };

    it("returns the same envelope keys as /subscriptions", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([
        SUBSCRIPTION_SHAPED_RECORD,
      ]);

      const response = await request(app)
        .get("/v1/payment-policies")
        .query({
          gatewayPublicKey: "7WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        })
        .expect(200);

      expect(Object.keys(response.body).sort()).toEqual(
        ["data", "success", "timestamp"].sort()
      );
    });

    it("returns data records with the same field shape as /subscriptions", async () => {
      mockGetSubscriptionDetails.mockResolvedValueOnce([
        SUBSCRIPTION_SHAPED_RECORD,
      ]);

      const response = await request(app)
        .get("/v1/payment-policies")
        .query({
          gatewayPublicKey: "7WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        })
        .expect(200);

      const record = response.body.data[0];
      expect(Object.keys(record).sort()).toEqual(
        [
          "createdAt",
          "gateway",
          "memo",
          "owner",
          "policyAccount",
          "policyId",
          "policyType",
          "recipient",
          "totalPaid",
          "updatedAt",
        ].sort()
      );
    });
  });
});
