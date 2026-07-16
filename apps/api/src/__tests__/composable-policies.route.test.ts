import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import express, { Application } from "express";
import { errorHandler } from "../middleware/errorHandler";

// Module mocks — the route delegates to the composable service (list + single)
// and to db/queries (executions). Mock those, not the SDK internals.
jest.mock("../services/composable", () => ({
  getComposablePolicyDetails: jest.fn(),
  getComposablePolicyByAddress: jest.fn(),
}));
jest.mock("@tributary-so/payments", () => ({
  PolicyLookupOptions: {},
}));
jest.mock("@tributary-so/sdk", () => ({}));
jest.mock("../db/queries", () => ({
  getComposableExecutionsByPolicyAddress: jest.fn(),
}));

import composablePoliciesRouter from "../routes/composable-policies";
import {
  getComposablePolicyDetails,
  getComposablePolicyByAddress,
} from "../services/composable";
import { getComposableExecutionsByPolicyAddress } from "../db/queries";

const mockGetDetails = getComposablePolicyDetails as jest.MockedFunction<any>;
const mockGetByAddress =
  getComposablePolicyByAddress as jest.MockedFunction<any>;
const mockGetExecutions =
  getComposableExecutionsByPolicyAddress as jest.MockedFunction<any>;

function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/v1/composable-policies", composablePoliciesRouter);
  app.use(errorHandler);
  return app;
}

const NORMALIZED_COMPOSABLE = {
  userPayment: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  gateway: "7WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  recipient: "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  policyId: 1,
  memo: "comp_tracking_123",
  totalInput: 5000000,
  totalOutput: 4990000,
  createdAt: 1704067200,
  updatedAt: 1704067200,
  policyAccount: "CompPolicyPDA1111111111111111111111111111111",
  forwardConfig: { inputMint: "USDC", outputMint: "WSOL" },
  preValidation: { disabled: {} },
  postValidation: { disabled: {} },
};

describe("Composable Policies API Routes", () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe("GET /v1/composable-policies (list)", () => {
    it("returns policies with a single filter", async () => {
      mockGetDetails.mockResolvedValueOnce([NORMALIZED_COMPOSABLE]);

      const response = await request(app)
        .get("/v1/composable-policies")
        .query({
          gatewayPublicKey: "7WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0].memo).toBe("comp_tracking_123");
      expect(response.body.data[0].forwardConfig).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it("returns 404 when no policy matches", async () => {
      mockGetDetails.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/composable-policies")
        .query({ gatewayPublicKey: "x" })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Composable policy not found");
    });

    it("forwards filter options to the service", async () => {
      mockGetDetails.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/composable-policies")
        .query({ recipient: "recipient123" })
        .expect(404);

      expect(mockGetDetails).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: "recipient123" })
      );
    });

    it("accepts walletPublicKey + tokenMint paired", async () => {
      mockGetDetails.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/composable-policies")
        .query({ walletPublicKey: "wallet123", tokenMint: "mint123" })
        .expect(404);

      expect(mockGetDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          walletPublicKey: "wallet123",
          tokenMint: "mint123",
        })
      );
    });

    it("rejects walletPublicKey without tokenMint", async () => {
      const response = await request(app)
        .get("/v1/composable-policies")
        .query({ walletPublicKey: "wallet123" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("walletPublicKey or tokenMint");
    });

    it("rejects tokenMint without walletPublicKey", async () => {
      const response = await request(app)
        .get("/v1/composable-policies")
        .query({ tokenMint: "mint123" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("walletPublicKey or tokenMint");
    });

    it("rejects request with no filters", async () => {
      const response = await request(app)
        .get("/v1/composable-policies")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Must specify one of");
    });

    it("rejects more than 3 filters", async () => {
      mockGetDetails.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/composable-policies")
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
      mockGetDetails.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/composable-policies")
        .query({
          trackingId: "track123",
          userPublicKey: "user123",
          gatewayPublicKey: "gateway123",
        })
        .expect(404);

      expect(mockGetDetails).toHaveBeenCalledWith({
        trackingId: "track123",
        userPublicKey: "user123",
        gatewayPublicKey: "gateway123",
      });
    });
  });

  describe("GET /v1/composable-policies/:address (single)", () => {
    it("returns a normalized policy when the account exists", async () => {
      mockGetByAddress.mockResolvedValueOnce(NORMALIZED_COMPOSABLE);

      const response = await request(app)
        .get(
          "/v1/composable-policies/CompPolicyPDA1111111111111111111111111111111"
        )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalInput).toBe(5000000);
      expect(response.body.data.totalOutput).toBe(4990000);
      expect(response.body.data.memo).toBe("comp_tracking_123");
      expect(mockGetByAddress).toHaveBeenCalledWith(
        "CompPolicyPDA1111111111111111111111111111111"
      );
    });

    it("returns 404 when the account does not exist", async () => {
      mockGetByAddress.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(
          "/v1/composable-policies/CompPolicyPDA1111111111111111111111111111111"
        )
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Composable policy not found");
    });
  });

  describe("GET /v1/composable-policies/:address/executions", () => {
    it("returns execution records via the query", async () => {
      mockGetExecutions.mockResolvedValueOnce([
        {
          id: 1,
          signature: "5Kq3...mock",
          slot: 999,
          timestamp: new Date("2024-01-02T00:00:00Z"),
          eventName: "tributary_ComposableExecuted",
          data: {
            input_amount: 100,
            output_amount: 99,
            composable_policy: "addr",
          },
        },
      ]);

      const response = await request(app)
        .get(
          "/v1/composable-policies/CompPolicyPDA1111111111111111111111111111111/executions"
        )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(mockGetExecutions).toHaveBeenCalledWith(
        "CompPolicyPDA1111111111111111111111111111111",
        expect.objectContaining({})
      );
    });

    it("passes through pagination params", async () => {
      mockGetExecutions.mockResolvedValueOnce([]);

      await request(app)
        .get(
          "/v1/composable-policies/CompPolicyPDA1111111111111111111111111111111/executions"
        )
        .query({ limit: 5, offset: 10 })
        .expect(200);

      expect(mockGetExecutions).toHaveBeenCalledWith(
        "CompPolicyPDA1111111111111111111111111111111",
        expect.objectContaining({ limit: 5, offset: 10 })
      );
    });

    it("defaults limit/offset when omitted", async () => {
      mockGetExecutions.mockResolvedValueOnce([]);

      await request(app)
        .get(
          "/v1/composable-policies/CompPolicyPDA1111111111111111111111111111111/executions"
        )
        .expect(200);

      expect(mockGetExecutions).toHaveBeenCalledWith(
        "CompPolicyPDA1111111111111111111111111111111",
        { limit: undefined, offset: undefined }
      );
    });
  });
});
