// @ts-nocheck
// Tests for validation utilities

import { ValidationUtils } from "../utils/validation";
import {
  TributaryValidationError,
  RELEASE_DUE_DATE,
  RELEASE_GATEWAY,
  RELEASE_OWNER,
  RELEASE_RECIPIENT,
} from "../utils/validation";

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

  // ────────────────────────────────────────────────────────────────────────
  // Per-variant validators (G-2, review 2026-07-06). These had no coverage
  // before; the tests below exercise each validator's happy path and each
  // documented failure mode.
  // ────────────────────────────────────────────────────────────────────────
  describe("validatePolicyConfig (dispatcher)", () => {
    it("dispatches subscription", () => {
      const spy = jest.spyOn(ValidationUtils, "validateSubscriptionConfig");
      ValidationUtils.validatePolicyConfig({
        mode: "subscription",
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        amount: 1000,
        autoRenew: true,
        maxRenewals: 12,
        paymentFrequency: "monthly",
      } as any);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("dispatches milestone", () => {
      const spy = jest.spyOn(ValidationUtils, "validateMilestoneConfig");
      ValidationUtils.validatePolicyConfig({
        mode: "milestone",
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        milestoneAmounts: [100, 200],
        milestoneTimestamps: [1, 2],
        releaseCondition: 0b0001,
        totalMilestones: 2,
      } as any);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("dispatches payAsYouGo", () => {
      const spy = jest.spyOn(ValidationUtils, "validatePayAsYouGoConfig");
      ValidationUtils.validatePolicyConfig({
        mode: "payAsYouGo",
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        maxAmountPerPeriod: 1000,
        maxChunkAmount: 100,
        periodLengthSeconds: 86400,
      } as any);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("dispatches oneTime", () => {
      const spy = jest.spyOn(ValidationUtils, "validateOneTimeConfig");
      ValidationUtils.validatePolicyConfig({
        mode: "oneTime",
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        amount: 500,
      } as any);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("dispatches upTo", () => {
      const spy = jest.spyOn(ValidationUtils, "validateUpToConfig");
      ValidationUtils.validatePolicyConfig({
        mode: "upTo",
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        gateway: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        maxAmount: 1000,
        deadline: Math.floor(Date.now() / 1000) + 3600,
      } as any);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("dispatches payment", () => {
      const spy = jest.spyOn(ValidationUtils, "validatePaymentConfig");
      ValidationUtils.validatePolicyConfig({
        mode: "payment",
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        amount: 250,
      } as any);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("validateSubscriptionConfig", () => {
    const valid = {
      amount: 1000,
      paymentFrequency: "monthly",
      maxRenewals: 12,
    } as any;

    it("passes with valid subscription", () => {
      expect(() =>
        ValidationUtils.validateSubscriptionConfig(valid)
      ).not.toThrow();
    });

    it("rejects zero amount", () => {
      expect(() =>
        ValidationUtils.validateSubscriptionConfig({
          ...valid,
          amount: 0,
        })
      ).toThrow(TributaryValidationError);
    });

    it("rejects negative amount", () => {
      expect(() =>
        ValidationUtils.validateSubscriptionConfig({
          ...valid,
          amount: -1,
        })
      ).toThrow("amount must be > 0");
    });

    it("rejects custom frequency with non-positive interval", () => {
      expect(() =>
        ValidationUtils.validateSubscriptionConfig({
          ...valid,
          paymentFrequency: "custom:0",
        })
      ).toThrow("custom interval must be > 0");
    });

    it("rejects custom frequency with interval > i64::MAX", () => {
      expect(() =>
        ValidationUtils.validateSubscriptionConfig({
          ...valid,
          paymentFrequency: "custom:99999999999999999999",
        })
      ).toThrow("custom interval must be <= i64::MAX");
    });

    it("accepts custom frequency with positive interval", () => {
      expect(() =>
        ValidationUtils.validateSubscriptionConfig({
          ...valid,
          paymentFrequency: "custom:3600",
        })
      ).not.toThrow();
    });

    it("rejects maxRenewals <= 0", () => {
      expect(() =>
        ValidationUtils.validateSubscriptionConfig({
          ...valid,
          maxRenewals: 0,
        })
      ).toThrow("maxRenewals must be > 0");
    });

    it("accepts null maxRenewals (indefinite)", () => {
      expect(() =>
        ValidationUtils.validateSubscriptionConfig({
          ...valid,
          maxRenewals: null,
        })
      ).not.toThrow();
    });
  });

  describe("validateMilestoneConfig", () => {
    const valid = {
      totalMilestones: 2,
      milestoneAmounts: [100, 200],
      releaseCondition: 0b0001,
    } as any;

    it("passes with valid milestone config", () => {
      expect(() =>
        ValidationUtils.validateMilestoneConfig(valid)
      ).not.toThrow();
    });

    it("rejects totalMilestones = 0", () => {
      expect(() =>
        ValidationUtils.validateMilestoneConfig({
          ...valid,
          totalMilestones: 0,
        })
      ).toThrow("totalMilestones must be in 1..=4");
    });

    it("rejects totalMilestones = 5", () => {
      expect(() =>
        ValidationUtils.validateMilestoneConfig({
          ...valid,
          totalMilestones: 5,
        })
      ).toThrow("totalMilestones must be in 1..=4");
    });

    it("rejects milestoneAmounts shorter than totalMilestones", () => {
      expect(() =>
        ValidationUtils.validateMilestoneConfig({
          ...valid,
          totalMilestones: 3,
          milestoneAmounts: [100, 200],
        })
      ).toThrow("milestoneAmounts must have at least 3 entries");
    });

    it("rejects zero active milestone amount", () => {
      expect(() =>
        ValidationUtils.validateMilestoneConfig({
          ...valid,
          milestoneAmounts: [100, 0],
        })
      ).toThrow("each active milestone amount must be > 0");
    });

    it("rejects mutually-exclusive signer bits GATEWAY+OWNER", () => {
      expect(() =>
        ValidationUtils.validateMilestoneConfig({
          ...valid,
          releaseCondition: RELEASE_GATEWAY | RELEASE_OWNER,
        })
      ).toThrow("signer bits (GATEWAY/OWNER/RECIPIENT) are mutually exclusive");
    });

    it("rejects mutually-exclusive signer bits OWNER+RECIPIENT", () => {
      expect(() =>
        ValidationUtils.validateMilestoneConfig({
          ...valid,
          releaseCondition: RELEASE_OWNER | RELEASE_RECIPIENT,
        })
      ).toThrow("signer bits (GATEWAY/OWNER/RECIPIENT) are mutually exclusive");
    });

    it("accepts DUE_DATE + one signer bit (boundary)", () => {
      expect(() =>
        ValidationUtils.validateMilestoneConfig({
          ...valid,
          releaseCondition: RELEASE_DUE_DATE | RELEASE_GATEWAY,
        })
      ).not.toThrow();
    });
  });

  describe("validatePayAsYouGoConfig", () => {
    const valid = {
      maxAmountPerPeriod: 1000,
      maxChunkAmount: 100,
      periodLengthSeconds: 86400,
    } as any;

    it("passes with valid pay-as-you-go", () => {
      expect(() =>
        ValidationUtils.validatePayAsYouGoConfig(valid)
      ).not.toThrow();
    });

    it("rejects zero period cap", () => {
      expect(() =>
        ValidationUtils.validatePayAsYouGoConfig({
          ...valid,
          maxAmountPerPeriod: 0,
        })
      ).toThrow("maxAmountPerPeriod must be > 0");
    });

    it("rejects zero chunk cap", () => {
      expect(() =>
        ValidationUtils.validatePayAsYouGoConfig({
          ...valid,
          maxChunkAmount: 0,
        })
      ).toThrow("maxChunkAmount must be > 0");
    });

    it("rejects chunk > period cap", () => {
      expect(() =>
        ValidationUtils.validatePayAsYouGoConfig({
          ...valid,
          maxAmountPerPeriod: 100,
          maxChunkAmount: 200,
        })
      ).toThrow("maxChunkAmount must be <= maxAmountPerPeriod");
    });

    it("rejects zero period length", () => {
      expect(() =>
        ValidationUtils.validatePayAsYouGoConfig({
          ...valid,
          periodLengthSeconds: 0,
        })
      ).toThrow("periodLengthSeconds must be > 0");
    });
  });

  describe("validateOneTimeConfig", () => {
    const valid = {
      amount: 500,
    } as any;

    it("passes with valid oneTime", () => {
      expect(() => ValidationUtils.validateOneTimeConfig(valid)).not.toThrow();
    });

    it("rejects zero amount", () => {
      expect(() =>
        ValidationUtils.validateOneTimeConfig({ ...valid, amount: 0 })
      ).toThrow("amount must be > 0");
    });

    it("rejects expiry <= due when both meaningful", () => {
      expect(() =>
        ValidationUtils.validateOneTimeConfig({
          ...valid,
          dueDate: 1000,
          expiryDate: 1000,
        })
      ).toThrow("expiryDate must be > dueDate");
    });

    it("accepts expiry == due when due <= 0 (immediate)", () => {
      expect(() =>
        ValidationUtils.validateOneTimeConfig({
          ...valid,
          dueDate: 0,
          expiryDate: 0,
        })
      ).not.toThrow();
    });

    it("accepts expiry > due", () => {
      expect(() =>
        ValidationUtils.validateOneTimeConfig({
          ...valid,
          dueDate: 1000,
          expiryDate: 2000,
        })
      ).not.toThrow();
    });
  });

  describe("validateUpToConfig", () => {
    const valid = {
      maxAmount: 1000,
      deadline: 2000,
    } as any;

    it("passes with valid upTo", () => {
      expect(() => ValidationUtils.validateUpToConfig(valid)).not.toThrow();
    });

    it("rejects zero maxAmount", () => {
      expect(() =>
        ValidationUtils.validateUpToConfig({ ...valid, maxAmount: 0 })
      ).toThrow("maxAmount must be > 0");
    });

    it("rejects zero deadline", () => {
      expect(() =>
        ValidationUtils.validateUpToConfig({ ...valid, deadline: 0 })
      ).toThrow("deadline must be > 0");
    });

    it("rejects deadline == validAfter when validAfter > 0", () => {
      expect(() =>
        ValidationUtils.validateUpToConfig({
          ...valid,
          validAfter: 2000,
        })
      ).toThrow("deadline must be > validAfter (strict)");
    });

    it("accepts deadline > validAfter", () => {
      expect(() =>
        ValidationUtils.validateUpToConfig({
          ...valid,
          validAfter: 1000,
          deadline: 2000,
        })
      ).not.toThrow();
    });
  });

  describe("validatePaymentConfig", () => {
    it("passes with positive amount", () => {
      expect(() =>
        ValidationUtils.validatePaymentConfig({ amount: 250 } as any)
      ).not.toThrow();
    });

    it("rejects zero amount", () => {
      expect(() =>
        ValidationUtils.validatePaymentConfig({ amount: 0 } as any)
      ).toThrow("amount must be > 0");
    });

    it("rejects negative amount", () => {
      expect(() =>
        ValidationUtils.validatePaymentConfig({ amount: -5 } as any)
      ).toThrow("amount must be > 0");
    });
  });

  describe("TributaryValidationError", () => {
    it("carries variant, field, and constraint", () => {
      const err = new TributaryValidationError(
        "subscription",
        "amount",
        "must be > 0"
      );
      expect(err.variant).toBe("subscription");
      expect(err.field).toBe("amount");
      expect(err.constraint).toBe("must be > 0");
      expect(err.message).toContain("[subscription]");
      expect(err.message).toContain("amount");
      expect(err.message).toContain("must be > 0");
      expect(err.name).toBe("TributaryValidationError");
    });

    it("supports custom message override", () => {
      const err = new TributaryValidationError(
        "oneTime",
        undefined,
        "invariant",
        "boom"
      );
      expect(err.message).toBe("boom");
      expect(err.field).toBeUndefined();
    });
  });
});
