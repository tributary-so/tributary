// @ts-nocheck
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

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).not.toThrow();
    });

    it("should throw error for invalid unitPrice", () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            description: "Test Product",
            unitPrice: -100,
            quantity: 1,
          },
        ],
        paymentFrequency: "monthly",
        mode: "subscription",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
      };

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).toThrow("line_items[0].unitPrice must be a positive number");
    });

    it("should throw error for invalid quantity (zero)", () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            description: "Test Product",
            unitPrice: 2000,
            quantity: 0,
          },
        ],
        paymentFrequency: "monthly",
        mode: "subscription",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
      };

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).toThrow("line_items[0].quantity must be a positive number");
    });

    it("should throw error for invalid quantity (negative)", () => {
      const params = {
        payment_method_types: ["tributary"],
        line_items: [
          {
            description: "Test Product",
            unitPrice: 2000,
            quantity: -1,
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
        } as any,
      };

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).toThrow("line_items[0].quantity must be a positive number");
    });

    it("should validate tributary config when present", () => {
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
        } as any,
      };

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).toThrow("Invalid gateway public key format");
    });

    it("should validate tributary config when present", () => {
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
        } as any,
      };

      expect(() =>
        ValidationUtils.validateCheckoutSessionParams(params)
      ).toThrow("Invalid gateway public key format");
    });
  });
});
