import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { getOneTimePaymentDetails } from "../services/onetime";
import * as queries from "../db/queries";
import { mockPaymentEvents } from "./fixtures/payment-events";

jest.mock("../db/queries");

describe("OneTime Payment Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getOneTimePaymentDetails", () => {
    it("should return formatted payment details for a single payment", async () => {
      const mockGetOneTimePaymentByTrackingId =
        queries.getOneTimePaymentByTrackingId as jest.MockedFunction<any>;
      mockGetOneTimePaymentByTrackingId.mockResolvedValueOnce([
        mockPaymentEvents.singlePayment,
      ]);

      const result = await getOneTimePaymentDetails("test_tracking_123");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        trackingId: "test_tracking_123",
        signature: mockPaymentEvents.singlePayment.signature,
        slot: mockPaymentEvents.singlePayment.slot,
        timestamp: mockPaymentEvents.singlePayment.timestamp,
        paymentPolicy: mockPaymentEvents.singlePayment.data.payment_policy,
        gateway: mockPaymentEvents.singlePayment.data.gateway,
        amount: mockPaymentEvents.singlePayment.data.amount,
        recordId: mockPaymentEvents.singlePayment.data.record_id,
      });
      expect(result[0].memo).toBeDefined();
      expect(mockGetOneTimePaymentByTrackingId).toHaveBeenCalledWith(
        "test_tracking_123",
        undefined
      );
    });

    it("should return multiple payment details for the same tracking ID", async () => {
      const mockGetOneTimePaymentByTrackingId =
        queries.getOneTimePaymentByTrackingId as jest.MockedFunction<any>;
      mockGetOneTimePaymentByTrackingId.mockResolvedValueOnce(
        mockPaymentEvents.multiplePayments
      );

      const result = await getOneTimePaymentDetails("test_tracking_456");

      expect(result).toHaveLength(3);
      expect(result[0].amount).toBe(1000000);
      expect(result[1].amount).toBe(2000000);
      expect(result[2].amount).toBe(3000000);
      expect(mockGetOneTimePaymentByTrackingId).toHaveBeenCalledWith(
        "test_tracking_456",
        undefined
      );
    });

    it("should return empty array when no payments found", async () => {
      const mockGetOneTimePaymentByTrackingId =
        queries.getOneTimePaymentByTrackingId as jest.MockedFunction<any>;
      mockGetOneTimePaymentByTrackingId.mockResolvedValueOnce([]);

      const result = await getOneTimePaymentDetails("nonexistent_tracking_id");

      expect(result).toHaveLength(0);
      expect(mockGetOneTimePaymentByTrackingId).toHaveBeenCalledWith(
        "nonexistent_tracking_id",
        undefined
      );
    });

    it("should pass recipient filter to database query", async () => {
      const mockGetOneTimePaymentByTrackingId =
        queries.getOneTimePaymentByTrackingId as jest.MockedFunction<any>;
      mockGetOneTimePaymentByTrackingId.mockResolvedValueOnce([
        mockPaymentEvents.paymentsWithRecipient,
      ]);

      const recipient = "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
      await getOneTimePaymentDetails("test_tracking_789", { recipient });

      expect(mockGetOneTimePaymentByTrackingId).toHaveBeenCalledWith(
        "test_tracking_789",
        expect.objectContaining({ recipient })
      );
    });

    it("should pass pagination parameters to database query", async () => {
      const mockGetOneTimePaymentByTrackingId =
        queries.getOneTimePaymentByTrackingId as jest.MockedFunction<any>;
      mockGetOneTimePaymentByTrackingId.mockResolvedValueOnce(
        mockPaymentEvents.paginationTest.slice(0, 10)
      );

      const limit = 10;
      const offset = 0;
      await getOneTimePaymentDetails("test_tracking_page", { limit, offset });

      expect(mockGetOneTimePaymentByTrackingId).toHaveBeenCalledWith(
        "test_tracking_page",
        expect.objectContaining({ limit, offset })
      );
    });

    it("should handle pagination with offset", async () => {
      const mockGetOneTimePaymentByTrackingId =
        queries.getOneTimePaymentByTrackingId as jest.MockedFunction<any>;
      mockGetOneTimePaymentByTrackingId.mockResolvedValueOnce(
        mockPaymentEvents.paginationTest.slice(10, 20)
      );

      const limit = 10;
      const offset = 10;
      const result = await getOneTimePaymentDetails("test_tracking_page", {
        limit,
        offset,
      });

      expect(result).toHaveLength(10);
      expect(mockGetOneTimePaymentByTrackingId).toHaveBeenCalledWith(
        "test_tracking_page",
        expect.objectContaining({ limit, offset })
      );
    });

    it("should handle special characters in tracking ID", async () => {
      const mockGetOneTimePaymentByTrackingId =
        queries.getOneTimePaymentByTrackingId as jest.MockedFunction<any>;
      mockGetOneTimePaymentByTrackingId.mockResolvedValueOnce([
        mockPaymentEvents.specialCharacters,
      ]);

      const result = await getOneTimePaymentDetails(
        "test_tracking_special-123_ABC"
      );

      expect(result).toHaveLength(1);
      expect(result[0].trackingId).toBe("test_tracking_special-123_ABC");
    });

    it("should handle unicode characters in tracking ID", async () => {
      const mockGetOneTimePaymentByTrackingId =
        queries.getOneTimePaymentByTrackingId as jest.MockedFunction<any>;
      mockGetOneTimePaymentByTrackingId.mockResolvedValueOnce([
        mockPaymentEvents.unicodeTrackingId,
      ]);

      const result = await getOneTimePaymentDetails("test_tracking_日本語");

      expect(result).toHaveLength(1);
      expect(result[0].trackingId).toBe("test_tracking_日本語");
    });

    it("should handle long tracking ID", async () => {
      const mockGetOneTimePaymentByTrackingId =
        queries.getOneTimePaymentByTrackingId as jest.MockedFunction<any>;
      mockGetOneTimePaymentByTrackingId.mockResolvedValueOnce([
        mockPaymentEvents.longTrackingId,
      ]);

      const longTrackingId = "a".repeat(64);
      const result = await getOneTimePaymentDetails(longTrackingId);

      expect(result).toHaveLength(1);
      expect(result[0].trackingId).toBe(longTrackingId);
    });

    it("should handle database errors gracefully", async () => {
      const mockGetOneTimePaymentByTrackingId =
        queries.getOneTimePaymentByTrackingId as jest.MockedFunction<any>;
      mockGetOneTimePaymentByTrackingId.mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      await expect(
        getOneTimePaymentDetails("test_tracking_error")
      ).rejects.toThrow("Database connection failed");
    });

    it("should convert memo bytes to string correctly", async () => {
      const mockGetOneTimePaymentByTrackingId =
        queries.getOneTimePaymentByTrackingId as jest.MockedFunction<any>;
      mockGetOneTimePaymentByTrackingId.mockResolvedValueOnce([
        mockPaymentEvents.singlePayment,
      ]);

      const result = await getOneTimePaymentDetails("test_tracking_123");

      expect(result[0].memo).toBe("test_tracking_123");
    });

    it("should handle all options combined", async () => {
      const mockGetOneTimePaymentByTrackingId =
        queries.getOneTimePaymentByTrackingId as jest.MockedFunction<any>;
      mockGetOneTimePaymentByTrackingId.mockResolvedValueOnce([
        mockPaymentEvents.paymentsWithRecipient,
      ]);

      const result = await getOneTimePaymentDetails("test_tracking_789", {
        recipient: "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        limit: 50,
        offset: 5,
      });

      expect(result).toHaveLength(1);
      expect(mockGetOneTimePaymentByTrackingId).toHaveBeenCalledWith(
        "test_tracking_789",
        expect.objectContaining({
          recipient: "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          limit: 50,
          offset: 5,
        })
      );
    });
  });
});
