// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import express, { Application } from "express";
import eventsRouter from "../routes/events";
import { errorHandler } from "../middleware/errorHandler";
import * as queries from "../db/queries";
import { encodeMemo as originalEncodeMemo } from "@tributary-so/sdk";

jest.mock("../db/queries");
jest.mock("@tributary-so/sdk", () => ({
  encodeMemo: jest.fn((memo: string) => {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(memo);
    const buffer = new Uint8Array(64).fill(0);
    buffer.set(encoded.slice(0, 64));
    return Array.from(buffer);
  }),
}));

const mockedQueries = queries as jest.Mocked<typeof queries>;
const mockedEncodeMemo = originalEncodeMemo as jest.MockedFunction<
  typeof originalEncodeMemo
>;

function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/v1/events", eventsRouter);
  app.use(errorHandler);
  return app;
}

const mockEvent = {
  id: 1,
  signature: "5Kq3...mock_signature",
  slot: 123456789,
  timestamp: new Date("2024-01-01T00:00:00Z"),
  eventName: "tributary_PaymentRecord",
  data: {
    gateway: "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    payment_policy: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    amount: 1000000,
  },
};

const serializedMockEvent = {
  ...mockEvent,
  timestamp: "2024-01-01T00:00:00.000Z",
};

describe("Events API Routes", () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe("GET /v1/events", () => {
    it("should return events by signature", async () => {
      mockedQueries.getEventsBySignature.mockResolvedValueOnce(mockEvent);

      const response = await request(app)
        .get("/v1/events")
        .query({ signature: "5Kq3...mock_signature" })
        .expect(200);

      expect(response.body).toEqual(serializedMockEvent);
      expect(mockedQueries.getEventsBySignature).toHaveBeenCalledWith(
        "5Kq3...mock_signature"
      );
    });

    it("should return 404 when event not found by signature", async () => {
      mockedQueries.getEventsBySignature.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .get("/v1/events")
        .query({ signature: "nonexistent" })
        .expect(404);

      expect(response.body.error).toBe("Event not found");
    });

    it("should return events by slot", async () => {
      mockedQueries.getEventsBySlot.mockResolvedValueOnce([mockEvent]);

      const response = await request(app)
        .get("/v1/events")
        .query({ slot: "123456789", limit: "50", offset: "10" })
        .expect(200);

      expect(response.body).toEqual([serializedMockEvent]);
      expect(mockedQueries.getEventsBySlot).toHaveBeenCalledWith(123456789, {
        limit: 50,
        offset: 10,
      });
    });

    it("should return events by eventName", async () => {
      mockedQueries.getEventsByName.mockResolvedValueOnce([mockEvent]);

      const response = await request(app)
        .get("/v1/events")
        .query({ eventName: "tributary_PaymentRecord" })
        .expect(200);

      expect(response.body).toEqual([serializedMockEvent]);
      expect(mockedQueries.getEventsByName).toHaveBeenCalledWith(
        "tributary_PaymentRecord",
        { limit: 100, offset: 0 }
      );
    });

    it("should return events by time range", async () => {
      mockedQueries.getEventsByTimeRange.mockResolvedValueOnce([mockEvent]);

      const response = await request(app)
        .get("/v1/events")
        .query({
          startTime: "2024-01-01T00:00:00Z",
          endTime: "2024-01-31T23:59:59Z",
        })
        .expect(200);

      expect(response.body).toEqual([serializedMockEvent]);
      expect(mockedQueries.getEventsByTimeRange).toHaveBeenCalled();
    });

    it("should return events with search when no specific filter", async () => {
      mockedQueries.searchEvents.mockResolvedValueOnce([mockEvent]);

      const response = await request(app).get("/v1/events").expect(200);

      expect(response.body).toEqual([serializedMockEvent]);
      expect(mockedQueries.searchEvents).toHaveBeenCalled();
    });

    it("should return events by trackingId", async () => {
      mockedQueries.getEventsByMemo.mockResolvedValueOnce([mockEvent]);
      const trackingId = "test-tracking-id";
      const encodedMemo = mockedEncodeMemo(trackingId, 64);

      const response = await request(app)
        .get("/v1/events")
        .query({ trackingId })
        .expect(200);

      expect(response.body).toEqual([serializedMockEvent]);
      expect(mockedQueries.getEventsByMemo).toHaveBeenCalledWith(encodedMemo, {
        limit: 100,
        offset: 0,
      });
    });

    it("should handle service errors", async () => {
      mockedQueries.searchEvents.mockRejectedValueOnce(new Error("DB error"));

      const response = await request(app).get("/v1/events").expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Internal server error");
    });
  });

  describe("GET /v1/events/count", () => {
    it("should return event count", async () => {
      mockedQueries.getEventCount.mockResolvedValueOnce(42);

      const response = await request(app).get("/v1/events/count").expect(200);

      expect(response.body.count).toBe(42);
    });

    it("should accept filter parameters", async () => {
      mockedQueries.getEventCount.mockResolvedValueOnce(10);

      await request(app)
        .get("/v1/events/count")
        .query({
          eventName: "tributary_PaymentRecord",
          startTime: "2024-01-01T00:00:00Z",
          endTime: "2024-01-31T23:59:59Z",
        })
        .expect(200);

      expect(mockedQueries.getEventCount).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: "tributary_PaymentRecord",
        })
      );
    });

    it("should handle service errors", async () => {
      mockedQueries.getEventCount.mockRejectedValueOnce(new Error("DB error"));

      const response = await request(app).get("/v1/events/count").expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /v1/events/names", () => {
    it("should return unique event names", async () => {
      mockedQueries.getUniqueEventNames.mockResolvedValueOnce([
        "tributary_PaymentRecord",
        "tributary_PaymentPolicyCreated",
      ]);

      const response = await request(app).get("/v1/events/names").expect(200);

      expect(response.body).toEqual([
        "tributary_PaymentRecord",
        "tributary_PaymentPolicyCreated",
      ]);
    });

    it("should handle service errors", async () => {
      mockedQueries.getUniqueEventNames.mockRejectedValueOnce(
        new Error("DB error")
      );

      const response = await request(app).get("/v1/events/names").expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /v1/events/names/tributary", () => {
    it("should return tributary event names", async () => {
      mockedQueries.getTributaryEventNames.mockResolvedValueOnce([
        "tributary_PaymentRecord",
      ]);

      const response = await request(app)
        .get("/v1/events/names/tributary")
        .expect(200);

      expect(response.body).toEqual(["tributary_PaymentRecord"]);
    });

    it("should handle service errors", async () => {
      mockedQueries.getTributaryEventNames.mockRejectedValueOnce(
        new Error("DB error")
      );

      const response = await request(app)
        .get("/v1/events/names/tributary")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /v1/events/payments", () => {
    it("should return payment records", async () => {
      mockedQueries.getPaymentRecords.mockResolvedValueOnce([mockEvent as any]);

      const response = await request(app)
        .get("/v1/events/payments")
        .query({ gateway: "gateway123" })
        .expect(200);

      expect(response.body).toEqual([serializedMockEvent]);
    });

    it("should accept limit and offset parameters", async () => {
      mockedQueries.getPaymentRecords.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/events/payments")
        .query({ limit: "50", offset: "25" })
        .expect(200);

      expect(mockedQueries.getPaymentRecords).toHaveBeenCalledWith({
        gateway: undefined,
        paymentPolicy: undefined,
        limit: 50,
        offset: 25,
      });
    });

    it("should handle service errors", async () => {
      mockedQueries.getPaymentRecords.mockRejectedValueOnce(
        new Error("DB error")
      );

      const response = await request(app)
        .get("/v1/events/payments")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /v1/events/payments/stats", () => {
    it("should return payment stats", async () => {
      mockedQueries.getPaymentStats.mockResolvedValueOnce({ count: 100 });

      const response = await request(app)
        .get("/v1/events/payments/stats")
        .expect(200);

      expect(response.body.count).toBe(100);
    });

    it("should accept filter parameters", async () => {
      mockedQueries.getPaymentStats.mockResolvedValueOnce({ count: 50 });

      await request(app)
        .get("/v1/events/payments/stats")
        .query({ gateway: "gateway123" })
        .expect(200);

      expect(mockedQueries.getPaymentStats).toHaveBeenCalledWith({
        gateway: "gateway123",
        startTime: undefined,
        endTime: undefined,
      });
    });

    it("should handle service errors", async () => {
      mockedQueries.getPaymentStats.mockRejectedValueOnce(
        new Error("DB error")
      );

      const response = await request(app)
        .get("/v1/events/payments/stats")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /v1/events/policies/created", () => {
    it("should return payment policy created events", async () => {
      mockedQueries.getPaymentPolicyCreatedEvents.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/events/policies/created")
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it("should accept filter parameters", async () => {
      mockedQueries.getPaymentPolicyCreatedEvents.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/events/policies/created")
        .query({ gateway: "gateway123", recipient: "recipient123" })
        .expect(200);

      expect(mockedQueries.getPaymentPolicyCreatedEvents).toHaveBeenCalledWith({
        gateway: "gateway123",
        recipient: "recipient123",
        userPayment: undefined,
        limit: 100,
        offset: 0,
      });
    });

    it("should handle service errors", async () => {
      mockedQueries.getPaymentPolicyCreatedEvents.mockRejectedValueOnce(
        new Error("DB error")
      );

      const response = await request(app)
        .get("/v1/events/policies/created")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /v1/events/policies/deleted", () => {
    it("should return payment policy deleted events", async () => {
      mockedQueries.getPaymentPolicyDeletedEvents.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/events/policies/deleted")
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it("should handle service errors", async () => {
      mockedQueries.getPaymentPolicyDeletedEvents.mockRejectedValueOnce(
        new Error("DB error")
      );

      const response = await request(app)
        .get("/v1/events/policies/deleted")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /v1/events/policies/status-changed", () => {
    it("should return policy status changed events", async () => {
      mockedQueries.getPaymentPolicyStatusChangedEvents.mockResolvedValueOnce(
        []
      );

      const response = await request(app)
        .get("/v1/events/policies/status-changed")
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it("should handle service errors", async () => {
      mockedQueries.getPaymentPolicyStatusChangedEvents.mockRejectedValueOnce(
        new Error("DB error")
      );

      const response = await request(app)
        .get("/v1/events/policies/status-changed")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /v1/events/gateways/created", () => {
    it("should return gateway created events", async () => {
      mockedQueries.getPaymentGatewayCreatedEvents.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/events/gateways/created")
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it("should accept filter parameters", async () => {
      mockedQueries.getPaymentGatewayCreatedEvents.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/events/gateways/created")
        .query({ authority: "authority123" })
        .expect(200);

      expect(mockedQueries.getPaymentGatewayCreatedEvents).toHaveBeenCalledWith(
        {
          authority: "authority123",
          limit: 100,
          offset: 0,
        }
      );
    });

    it("should handle service errors", async () => {
      mockedQueries.getPaymentGatewayCreatedEvents.mockRejectedValueOnce(
        new Error("DB error")
      );

      const response = await request(app)
        .get("/v1/events/gateways/created")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /v1/events/gateways/deleted", () => {
    it("should return gateway deleted events", async () => {
      mockedQueries.getPaymentGatewayDeletedEvents.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/events/gateways/deleted")
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it("should handle service errors", async () => {
      mockedQueries.getPaymentGatewayDeletedEvents.mockRejectedValueOnce(
        new Error("DB error")
      );

      const response = await request(app)
        .get("/v1/events/gateways/deleted")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /v1/events/gateways/fee-bps-changed", () => {
    it("should return gateway fee bps changed events", async () => {
      mockedQueries.getGatewayFeeBpsChangedEvents.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/events/gateways/fee-bps-changed")
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it("should handle service errors", async () => {
      mockedQueries.getGatewayFeeBpsChangedEvents.mockRejectedValueOnce(
        new Error("DB error")
      );

      const response = await request(app)
        .get("/v1/events/gateways/fee-bps-changed")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /v1/events/gateways/fee-recipient-changed", () => {
    it("should return gateway fee recipient changed events", async () => {
      mockedQueries.getGatewayFeeRecipientChangedEvents.mockResolvedValueOnce(
        []
      );

      const response = await request(app)
        .get("/v1/events/gateways/fee-recipient-changed")
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it("should handle service errors", async () => {
      mockedQueries.getGatewayFeeRecipientChangedEvents.mockRejectedValueOnce(
        new Error("DB error")
      );

      const response = await request(app)
        .get("/v1/events/gateways/fee-recipient-changed")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /v1/events/gateways/signer-changed", () => {
    it("should return gateway signer changed events", async () => {
      mockedQueries.getGatewaySignerChangedEvents.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/events/gateways/signer-changed")
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it("should handle service errors", async () => {
      mockedQueries.getGatewaySignerChangedEvents.mockRejectedValueOnce(
        new Error("DB error")
      );

      const response = await request(app)
        .get("/v1/events/gateways/signer-changed")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /v1/events/referrals/rewards", () => {
    it("should return referral reward events", async () => {
      mockedQueries.getReferralRewardDistributedEvents.mockResolvedValueOnce(
        []
      );

      const response = await request(app)
        .get("/v1/events/referrals/rewards")
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it("should accept filter parameters", async () => {
      mockedQueries.getReferralRewardDistributedEvents.mockResolvedValueOnce(
        []
      );

      await request(app)
        .get("/v1/events/referrals/rewards")
        .query({ gateway: "gateway123", paymentPolicy: "policy123" })
        .expect(200);

      expect(
        mockedQueries.getReferralRewardDistributedEvents
      ).toHaveBeenCalledWith({
        gateway: "gateway123",
        paymentPolicy: "policy123",
        limit: 100,
        offset: 0,
      });
    });

    it("should handle service errors", async () => {
      mockedQueries.getReferralRewardDistributedEvents.mockRejectedValueOnce(
        new Error("DB error")
      );

      const response = await request(app)
        .get("/v1/events/referrals/rewards")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /v1/events/user-payments/created", () => {
    it("should return user payment created events", async () => {
      mockedQueries.getUserPaymentCreatedEvents.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/events/user-payments/created")
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it("should accept filter parameters", async () => {
      mockedQueries.getUserPaymentCreatedEvents.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/events/user-payments/created")
        .query({ owner: "owner123", tokenMint: "mint123" })
        .expect(200);

      expect(mockedQueries.getUserPaymentCreatedEvents).toHaveBeenCalledWith({
        owner: "owner123",
        tokenMint: "mint123",
        limit: 100,
        offset: 0,
      });
    });

    it("should handle service errors", async () => {
      mockedQueries.getUserPaymentCreatedEvents.mockRejectedValueOnce(
        new Error("DB error")
      );

      const response = await request(app)
        .get("/v1/events/user-payments/created")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /v1/events/program/config-created", () => {
    it("should return program config created events", async () => {
      mockedQueries.getProgramConfigCreatedEvents.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/v1/events/program/config-created")
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it("should accept filter parameters", async () => {
      mockedQueries.getProgramConfigCreatedEvents.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/events/program/config-created")
        .query({ admin: "admin123" })
        .expect(200);

      expect(mockedQueries.getProgramConfigCreatedEvents).toHaveBeenCalledWith({
        admin: "admin123",
        limit: 100,
        offset: 0,
      });
    });

    it("should handle service errors", async () => {
      mockedQueries.getProgramConfigCreatedEvents.mockRejectedValueOnce(
        new Error("DB error")
      );

      const response = await request(app)
        .get("/v1/events/program/config-created")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /v1/events/typed/:eventName", () => {
    it("should return typed events by event name", async () => {
      mockedQueries.getTypedEvents.mockResolvedValueOnce([mockEvent as any]);

      const response = await request(app)
        .get("/v1/events/typed/tributary_PaymentRecord")
        .expect(200);

      expect(response.body).toEqual([serializedMockEvent]);
    });

    it("should accept limit and offset parameters", async () => {
      mockedQueries.getTypedEvents.mockResolvedValueOnce([]);

      await request(app)
        .get("/v1/events/typed/tributary_PaymentRecord")
        .query({ limit: "50", offset: "10" })
        .expect(200);

      expect(mockedQueries.getTypedEvents).toHaveBeenCalledWith(
        "tributary_PaymentRecord",
        { limit: 50, offset: 10 }
      );
    });

    it("should handle service errors", async () => {
      mockedQueries.getTypedEvents.mockRejectedValueOnce(new Error("DB error"));

      const response = await request(app)
        .get("/v1/events/typed/tributary_PaymentRecord")
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
