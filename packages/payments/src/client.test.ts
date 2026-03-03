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
        "line_items is required for subscription mode"
      );
    });
  });
});
