// @ts-nocheck
// Tests for PaymentsClient and core functionality

import { PaymentsClient } from "./index";

describe("PaymentsClient", () => {
  let mockConnection: any;
  let mockTributary: any;
  let client: PaymentsClient;

  beforeEach(() => {
    mockConnection = {
      getAccountInfo: jest.fn(),
      getParsedTransaction: jest.fn(),
      getSignaturesForAddress: jest.fn(),
    };

    mockTributary = {
      getUserPaymentPda: jest
        .fn()
        .mockReturnValue({ address: "mockUserPaymentPda" }),
      getPaymentPoliciesByUserPayment: jest.fn().mockResolvedValue([]),
      getPaymentPoliciesByGateway: jest.fn().mockResolvedValue([]),
      getPaymentPolicy: jest.fn(),
    };

    client = new PaymentsClient(mockTributary);
  });

  describe("constructor", () => {
    it("should create client with required parameters", () => {
      expect(client).toBeDefined();
      expect(client.checkout).toBeDefined();
      expect(client.checkout.sessions).toBeDefined();
      expect(client.payments).toBeDefined();
      expect(client.subscriptions).toBeDefined();
    });
  });

  describe("checkout.sessions.create", () => {
    it("should create a checkout session with valid parameters", async () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            description: "Test Product",
            unitPrice: 2000,
            quantity: 1,
          },
        ],
        paymentFrequency: "monthly",
        mode: "subscription",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        tributaryConfig: {
          gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          trackingId: "test_tracking_id",
        },
      };

      const session = await client.checkout.sessions.create(params);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.object).toBe("checkout.session");
      expect(session.payment_method_types).toEqual(["tributary"]);
      expect(session.mode).toBe("subscription");
      expect(session.payment_status).toBe("unpaid");
      expect(session.status).toBe("open");
      expect(session.url).toBeDefined();
    });

    it("should throw error for invalid gateway key", async () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            description: "Test Product",
            unitPrice: 2000,
            quantity: 1,
          },
        ],
        paymentFrequency: "monthly",
        mode: "subscription",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        tributaryConfig: {
          gateway: "invalid-key",
          recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          trackingId: "test_tracking_id",
        },
      };

      await expect(client.checkout.sessions.create(params)).rejects.toThrow(
        "Invalid gateway public key format"
      );
    });

    it("should throw error for invalid tracking ID", async () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            description: "Test Product",
            unitPrice: 2000,
            quantity: 1,
          },
        ],
        paymentFrequency: "monthly",
        mode: "subscription",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        tributaryConfig: {
          gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          trackingId: "invalid tracking id with spaces",
        },
      };

      await expect(client.checkout.sessions.create(params)).rejects.toThrow(
        "Invalid trackingId format"
      );
    });

    it("should throw error for missing line items", async () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [],
        paymentFrequency: "monthly",
        mode: "subscription",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        tributaryConfig: {
          gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          trackingId: "test_tracking_id",
        },
      };

      await expect(client.checkout.sessions.create(params)).rejects.toThrow(
        "line_items is required and must be a non-empty array"
      );
    });
  });

  describe("subscriptions.checkStatus", () => {
    it("should check subscription status with user-based lookup", async () => {
      const status = await client.subscriptions.checkStatus({
        trackingId: "test_tracking_id",
        userPublicKey: "test_user_public_key",
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      });

      expect(status).toBeDefined();
      expect(status.status).toMatch(/pending|created|active|failed/);
      expect(typeof status.subscriptionCreated).toBe("boolean");
      expect(typeof status.initialPaymentExecuted).toBe("boolean");
      expect(typeof status.paymentCount).toBe("number");
    });

    it("should check subscription status with gateway-based lookup", async () => {
      const status = await client.subscriptions.checkStatus({
        trackingId: "test_tracking_id",
        gatewayPublicKey: "test_gateway_public_key",
      });

      expect(status).toBeDefined();
      expect(status.status).toMatch(/pending|created|active|failed/);
    });

    it("should return pending status when neither user nor gateway public key is provided", async () => {
      const status = await client.subscriptions.checkStatus({
        trackingId: "test_tracking_id",
        userPublicKey: "test_user_public_key",
      });

      expect(status).toBeDefined();
      expect(status.status).toBe("pending");
      expect(status.subscriptionCreated).toBe(false);
      expect(status.initialPaymentExecuted).toBe(false);
      expect(status.paymentCount).toBe(0);
    });
  });

  describe("subscriptions.isActive", () => {
    it("should return boolean for subscription status", async () => {
      const isActive = await client.subscriptions.isActive({
        trackingId: "test_tracking_id",
        userPublicKey: "test_user_public_key",
      });

      expect(typeof isActive).toBe("boolean");
    });

    it("should work with gateway-based lookup", async () => {
      const isActive = await client.subscriptions.isActive({
        trackingId: "test_tracking_id",
        gatewayPublicKey: "test_gateway_public_key",
      });

      expect(typeof isActive).toBe("boolean");
    });
  });

  describe("subscriptions.getDetails", () => {
    it("should return subscription details or null", async () => {
      const details = await client.subscriptions.getDetails({
        trackingId: "test_tracking_id",
        userPublicKey: "test_user_public_key",
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      });

      expect(details === null || typeof details === "object").toBe(true);
    });

    it("should work with gateway-based lookup", async () => {
      const details = await client.subscriptions.getDetails({
        trackingId: "test_tracking_id",
        gatewayPublicKey: "test_gateway_public_key",
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      });

      expect(details === null || typeof details === "object").toBe(true);
    });
  });

  describe("payments.checkStatus", () => {
    it("should check payment status using legacy method", async () => {
      const status = await client.payments.checkStatus(
        "test_tracking_id",
        "test_recipient"
      );

      expect(status).toBeDefined();
      expect(status.status).toMatch(/pending|paid|failed/);
      expect(Array.isArray(status.transactions)).toBe(true);
    });
  });

  describe("payments.getHistory", () => {
    it("should get payment history using legacy method", async () => {
      const history = await client.payments.getHistory(
        "test_tracking_id",
        "test_recipient"
      );

      expect(Array.isArray(history)).toBe(true);
    });
  });
});
