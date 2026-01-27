// Tests for validation utilities

import { ValidationUtils } from "../utils/validation";

describe("ValidationUtils", () => {
  describe("validateTributaryConfig", () => {
    it("should pass with valid configuration", () => {
      const config = {
        gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        trackingId: "test_tracking_id",
      };

      expect(() =>
        ValidationUtils.validateTributaryConfig(config)
      ).not.toThrow();
    });

    it("should throw error for missing gateway", () => {
      const config = {
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        trackingId: "test_tracking_id",
      } as any;

      expect(() => ValidationUtils.validateTributaryConfig(config)).toThrow(
        "gateway, recipient, and trackingId are required in tributaryConfig"
      );
    });

    it("should throw error for missing recipient", () => {
      const config = {
        gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        trackingId: "test_tracking_id",
      } as any;

      expect(() => ValidationUtils.validateTributaryConfig(config)).toThrow(
        "gateway, recipient, and trackingId are required in tributaryConfig"
      );
    });

    it("should throw error for missing trackingId", () => {
      const config = {
        gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      } as any;

      expect(() => ValidationUtils.validateTributaryConfig(config)).toThrow(
        "gateway, recipient, and trackingId are required in tributaryConfig"
      );
    });

    it("should throw error for invalid gateway public key", () => {
      const config = {
        gateway: "invalid-key",
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        trackingId: "test_tracking_id",
      } as any;

      expect(() => ValidationUtils.validateTributaryConfig(config)).toThrow(
        "Invalid gateway public key format"
      );
    });

    it("should throw error for invalid recipient public key", () => {
      const config = {
        gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        recipient: "invalid-key",
        trackingId: "test_tracking_id",
      } as any;

      expect(() => ValidationUtils.validateTributaryConfig(config)).toThrow(
        "Invalid recipient public key format"
      );
    });

    it("should throw error for invalid tracking ID with spaces", () => {
      const config = {
        gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        trackingId: "invalid tracking id",
      } as any;

      expect(() => ValidationUtils.validateTributaryConfig(config)).toThrow(
        "Invalid trackingId format"
      );
    });

    it("should throw error for tracking ID that's too long", () => {
      const config = {
        gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        trackingId: "a".repeat(65),
      } as any;

      expect(() => ValidationUtils.validateTributaryConfig(config)).toThrow(
        "Invalid trackingId format"
      );
    });

    it("should throw error for invalid recipient public key", () => {
      const config = {
        gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        recipient: "invalid-key",
        trackingId: "test_tracking_id",
      };

      expect(() => ValidationUtils.validateTributaryConfig(config)).toThrow(
        "Invalid recipient public key format"
      );
    });

    it("should throw error for invalid tracking ID with spaces", () => {
      const config = {
        gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        trackingId: "invalid tracking id",
      };

      expect(() => ValidationUtils.validateTributaryConfig(config)).toThrow(
        "Invalid trackingId format"
      );
    });

    it("should throw error for tracking ID that's too long", () => {
      const config = {
        gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        trackingId: "a".repeat(65),
      };

      expect(() => ValidationUtils.validateTributaryConfig(config)).toThrow(
        "Invalid trackingId format"
      );
    });
  });

  describe("validateCheckoutSessionParams", () => {
    it("should pass with valid subscription parameters", () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Test Product" },
              unit_amount: 2000,
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        tributaryConfig: {
          gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          trackingId: "test_tracking_id",
        },
      };

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).not.toThrow();
    });

    it("should throw error for missing line items", () => {
      const params = {
        payment_method_types: ["tributary"],
        mode: "subscription",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
      };

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).toThrow("line_items is required and must be a non-empty array");
    });

    it("should throw error for empty line items array", () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [],
        mode: "subscription",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
      };

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).toThrow("line_items is required and must be a non-empty array");
    });

    it("should throw error for invalid mode", () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Test Product" },
              unit_amount: 2000,
            },
            quantity: 1,
          },
        ],
        mode: "invalid_mode",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
      };

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).toThrow('mode must be "payment" or "subscription"');
    });

    it("should throw error for unsupported payment method", () => {
      const params = {
        payment_method_types: ["stripe"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Test Product" },
              unit_amount: 2000,
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
      };

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).toThrow('Only "tributary" payment method is supported');
    });

    it("should throw error for missing price_data", () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
      };

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).toThrow("line_items[0].price_data is required");
    });

    it("should throw error for invalid currency", () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: { name: "Test Product" },
              unit_amount: 2000,
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
      };

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).toThrow('line_items[0].price_data.currency must be "usd"');
    });

    it("should throw error for missing product name", () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {},
              unit_amount: 2000,
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
      };

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).toThrow("line_items[0].price_data.product_data.name is required");
    });

    it("should throw error for invalid unit amount (zero)", () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Test Product" },
              unit_amount: 0,
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
      };

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).toThrow(
        "line_items[0].price_data.unit_amount must be a positive number"
      );
    });

    it("should throw error for invalid unit amount (negative)", () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Test Product" },
              unit_amount: -100,
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
      };

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).toThrow(
        "line_items[0].price_data.unit_amount must be a positive number"
      );
    });

    it("should validate tributary config when present", () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Test Product" },
              unit_amount: 2000,
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        tributaryConfig: {
          gateway: "invalid-key",
          recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          trackingId: "test_tracking_id",
        } as any,
      };

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).toThrow("Invalid gateway public key format");
    });
  });
});
