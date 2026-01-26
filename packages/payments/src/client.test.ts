import { PaymentsClient } from "../src/index";

// Mock the PaymentTracker to avoid network calls
const mockPaymentStatus = {
  status: "pending" as const,
  transactions: [] as const,
};

const mockPaymentHistory: any[] = [];

jest.mock("../src/core/tracking", () => ({
  PaymentTracker: jest.fn().mockImplementation(() => ({
    checkPaymentStatus: jest.fn().mockResolvedValue(mockPaymentStatus),
    getPaymentHistory: jest.fn().mockResolvedValue(mockPaymentHistory),
  })),
}));

describe("PaymentsClient", () => {
  let client: PaymentsClient;

  beforeEach(() => {
    client = new PaymentsClient();
  });

  describe("constructor", () => {
    it("should create client without configuration", () => {
      expect(client).toBeInstanceOf(PaymentsClient);
      expect(client.checkout).toBeDefined();
      expect(client.payments).toBeDefined();
    });
  });

  describe("checkout.create", () => {
    it("should create a checkout session with valid parameters", async () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Test Product" },
              unit_amount: 2000,
              recurring: { interval: "month" as const },
            },
            quantity: 1,
          },
        ],
        mode: "subscription" as const,
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        tributaryConfig: {
          gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          trackingId: "test_tracking_id",
          autoRenew: true,
          memo: "Test subscription",
        },
      };

      const session = await client.checkout.create(params);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.object).toBe("checkout.session");
      expect(session.payment_method_types).toEqual(["tributary"]);
      expect(session.mode).toBe("subscription");
      expect(session.payment_status).toBe("unpaid");
      expect(session.status).toBe("open");
      expect(session.tributaryConfig).toEqual(params.tributaryConfig);
    });

    it("should throw error for invalid gateway key", async () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Test Product" },
              unit_amount: 2000,
              recurring: { interval: "month" as const },
            },
            quantity: 1,
          },
        ],
        mode: "subscription" as const,
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        tributaryConfig: {
          gateway: "invalid-key",
          recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          trackingId: "test_tracking_id",
        },
      };

      await expect(client.checkout.create(params)).rejects.toThrow(
        "Invalid gateway public key format"
      );
    });

    it("should throw error for invalid tracking ID", async () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Test Product" },
              unit_amount: 2000,
              recurring: { interval: "month" as const },
            },
            quantity: 1,
          },
        ],
        mode: "subscription" as const,
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        tributaryConfig: {
          gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          trackingId: "invalid tracking id with spaces",
        },
      };

      await expect(client.checkout.create(params)).rejects.toThrow(
        "Invalid trackingId format"
      );
    });

    it("should throw error for missing line items", async () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [],
        mode: "subscription" as const,
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        tributaryConfig: {
          gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          trackingId: "test_tracking_id",
        },
      };

      await expect(client.checkout.create(params)).rejects.toThrow(
        "line_items is required and must be a non-empty array"
      );
    });
  });

  describe("payments.checkStatus", () => {
    it("should check payment status", async () => {
      const status = await client.payments.checkStatus(
        "test_tracking_id",
        "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
      );

      expect(status).toBeDefined();
      expect(status.status).toMatch(/pending|paid|failed/);
      expect(Array.isArray(status.transactions)).toBe(true);
    });
  });

  describe("payments.getHistory", () => {
    it("should get payment history", async () => {
      const history = await client.payments.getHistory(
        "test_tracking_id",
        "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
      );

      expect(Array.isArray(history)).toBe(true);
    });
  });
});
