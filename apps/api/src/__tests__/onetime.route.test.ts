import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import express, { Application } from "express";
import onetimeRouter from "../routes/onetime";
import * as onetimeService from "../services/onetime";
import { errorHandler } from "../middleware/errorHandler";
import { mockPaymentEvents } from "./fixtures/payment-events";

jest.mock("../services/onetime");

function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/v1/onetime", onetimeRouter);
  app.use(errorHandler);
  return app;
}

describe("OneTime Payment API Routes", () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe("GET /v1/onetime/:trackingId", () => {
    it("should return payment details for valid trackingId", async () => {
      const mockGetOneTimePaymentDetails =
        onetimeService.getOneTimePaymentDetails as jest.MockedFunction<any>;
      mockGetOneTimePaymentDetails.mockResolvedValueOnce([
        {
          trackingId: "test_tracking_123",
          signature: "5Kq3...mock_signature",
          slot: 123456789,
          timestamp: new Date("2024-01-01T00:00:00Z"),
          paymentPolicy: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          gateway: "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          amount: 1000000,
          memo: "test_tracking_123",
          recordId: 1,
        },
      ]);

      const response = await request(app)
        .get("/v1/onetime/test_tracking_123")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.trackingId).toBe("test_tracking_123");
      expect(response.body.timestamp).toBeDefined();
    });

    it("should return 404 when payment not found", async () => {
      const mockGetOneTimePaymentDetails =
        onetimeService.getOneTimePaymentDetails as jest.MockedFunction<any>;
      mockGetOneTimePaymentDetails.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/onetime/nonexistent_id")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("One-time payment not found");
    });

    it("should return 404 when result is empty array", async () => {
      const mockGetOneTimePaymentDetails =
        onetimeService.getOneTimePaymentDetails as jest.MockedFunction<any>;
      mockGetOneTimePaymentDetails.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/onetime/empty_result")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("One-time payment not found");
    });

    it("should handle query parameters (recipient, limit, offset)", async () => {
      const mockGetOneTimePaymentDetails =
        onetimeService.getOneTimePaymentDetails as jest.MockedFunction<any>;
      mockGetOneTimePaymentDetails.mockResolvedValueOnce([
        {
          trackingId: "test_tracking_789",
          signature: "5Kq3...mock_signature",
          slot: 123456789,
          timestamp: new Date("2024-01-01T00:00:00Z"),
          paymentPolicy: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          gateway: "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          amount: 5000000,
          memo: "test_tracking_789",
          recordId: 1,
        },
      ]);

      const response = await request(app)
        .get("/v1/onetime/test_tracking_789")
        .query({
          recipient: "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          limit: "10",
          offset: "5",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockGetOneTimePaymentDetails).toHaveBeenCalledWith(
        "test_tracking_789",
        expect.objectContaining({
          recipient: "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          limit: 10,
          offset: 5,
        })
      );
    });

    it("should return multiple payments as array", async () => {
      const mockGetOneTimePaymentDetails =
        onetimeService.getOneTimePaymentDetails as jest.MockedFunction<any>;
      mockGetOneTimePaymentDetails.mockResolvedValueOnce([
        {
          trackingId: "test_tracking_456",
          signature: "sig1",
          slot: 123456789,
          timestamp: new Date("2024-01-01T00:00:00Z"),
          paymentPolicy: "policy1",
          gateway: "gateway1",
          amount: 1000000,
          memo: "test_tracking_456",
          recordId: 1,
        },
        {
          trackingId: "test_tracking_456",
          signature: "sig2",
          slot: 123456790,
          timestamp: new Date("2024-01-02T00:00:00Z"),
          paymentPolicy: "policy2",
          gateway: "gateway2",
          amount: 2000000,
          memo: "test_tracking_456",
          recordId: 2,
        },
      ]);

      const response = await request(app)
        .get("/v1/onetime/test_tracking_456")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it("should return single payment as object (not array)", async () => {
      const mockGetOneTimePaymentDetails =
        onetimeService.getOneTimePaymentDetails as jest.MockedFunction<any>;
      mockGetOneTimePaymentDetails.mockResolvedValueOnce([
        {
          trackingId: "test_tracking_single",
          signature: "sig1",
          slot: 123456789,
          timestamp: new Date("2024-01-01T00:00:00Z"),
          paymentPolicy: "policy1",
          gateway: "gateway1",
          amount: 1000000,
          memo: "test_tracking_single",
          recordId: 1,
        },
      ]);

      const response = await request(app)
        .get("/v1/onetime/test_tracking_single")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(false);
      expect(response.body.data.trackingId).toBe("test_tracking_single");
    });

    it("should handle service errors", async () => {
      const mockGetOneTimePaymentDetails =
        onetimeService.getOneTimePaymentDetails as jest.MockedFunction<any>;
      mockGetOneTimePaymentDetails.mockRejectedValueOnce(
        new Error("Service error")
      );

      const response = await request(app)
        .get("/v1/onetime/error_test")
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Internal server error");
    });

    it("should handle special characters in trackingId", async () => {
      const mockGetOneTimePaymentDetails =
        onetimeService.getOneTimePaymentDetails as jest.MockedFunction<any>;
      mockGetOneTimePaymentDetails.mockResolvedValueOnce([
        {
          trackingId: "test_tracking_special-123_ABC",
          signature: "sig1",
          slot: 123456789,
          timestamp: new Date("2024-01-01T00:00:00Z"),
          paymentPolicy: "policy1",
          gateway: "gateway1",
          amount: 1000000,
          memo: "test_tracking_special-123_ABC",
          recordId: 1,
        },
      ]);

      const response = await request(app)
        .get("/v1/onetime/test_tracking_special-123_ABC")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trackingId).toBe(
        "test_tracking_special-123_ABC"
      );
    });

    it("should handle numeric limit and offset conversion", async () => {
      const mockGetOneTimePaymentDetails =
        onetimeService.getOneTimePaymentDetails as jest.MockedFunction<any>;
      mockGetOneTimePaymentDetails.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/onetime/numeric_test")
        .query({ limit: "25", offset: "10" })
        .expect(404);

      expect(mockGetOneTimePaymentDetails).toHaveBeenCalledWith(
        "numeric_test",
        expect.objectContaining({
          limit: 25,
          offset: 10,
        })
      );
    });

    it("should handle undefined limit and offset", async () => {
      const mockGetOneTimePaymentDetails =
        onetimeService.getOneTimePaymentDetails as jest.MockedFunction<any>;
      mockGetOneTimePaymentDetails.mockResolvedValueOnce([]);

      await request(app).get("/v1/onetime/undefined_test").expect(404);

      expect(mockGetOneTimePaymentDetails).toHaveBeenCalledWith(
        "undefined_test",
        expect.objectContaining({
          limit: undefined,
          offset: undefined,
        })
      );
    });

    it("should handle missing trackingId parameter", async () => {
      const mockGetOneTimePaymentDetails =
        onetimeService.getOneTimePaymentDetails as jest.MockedFunction<any>;

      const response = await request(app).get("/v1/onetime/").expect(404);

      expect(mockGetOneTimePaymentDetails).not.toHaveBeenCalled();
    });
  });
});
