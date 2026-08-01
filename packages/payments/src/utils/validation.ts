// Input validation utilities

import { LegacyTributaryConfig } from "../types/tributary";
import type {
  CheckoutParams,
  SubscriptionParams,
  MilestoneParams,
  PayAsYouGoParams,
  OneTimePolicyParams,
  UpToParams,
  OneTimeParams,
} from "../core/session";

/**
 * Milestone release-condition bitmap flags. Mirror of the on-chain constants
 * in `programs/tributary/src/state/payment_policy.rs`. Bits 1-3 (the signer
 * gates) are mutually exclusive; bit 0 (due-date) is independent.
 */
export const RELEASE_DUE_DATE = 0b0001;
export const RELEASE_GATEWAY = 0b0010;
export const RELEASE_OWNER = 0b0100;
export const RELEASE_RECIPIENT = 0b1000;
const SIGNER_BITS_MASK = ~RELEASE_DUE_DATE & 0xff; // bits 1,2,3

/** 2^63 - 1. Upper bound the on-chain validator enforces for Custom interval
 *  (subscription) and period_length_seconds (pay-as-you-go) — both cast to i64. */
const I64_MAX = Number(2n ** 63n - 1n);

/**
 * Error thrown by the per-variant fail-fast validators. Carries enough
 * structure for callers (and tests) to assert which constraint failed.
 */
export class TributaryValidationError extends Error {
  readonly variant: string;
  readonly field?: string;
  readonly constraint: string;

  constructor(
    variant: string,
    field: string | undefined,
    constraint: string,
    message?: string
  ) {
    super(
      message ||
        `[${variant}] validation failed${
          field ? `: ${field}` : ""
        } — ${constraint}`
    );
    this.name = "TributaryValidationError";
    this.variant = variant;
    this.field = field;
    this.constraint = constraint;
  }
}

// ponytail: Number() loses precision above 2^53; the on-chain u64/i64 is the
// final authority at execution time. Acceptable for create-time validation —
// every comparison here is directional (>, <=) against small user inputs or
// the i64 ceiling, both of which Number() handles correctly.
const toNum = (v: number | string): number => Number(v);

export class ValidationUtils {
  // Validate the legacy Tributary configuration shape (common gateway /
  // recipient / trackingId fields). Per-variant fail-fast validation of the
  // new discriminated union lands in feature tributary-uny8.
  static validateTributaryConfig(config: LegacyTributaryConfig): void {
    if (!config.gateway || !config.recipient || !config.trackingId) {
      throw new Error(
        "gateway, recipient, and trackingId are required in tributaryConfig"
      );
    }

    // Validate public key formats (basic check)
    if (!this.isValidPublicKey(config.gateway)) {
      throw new Error("Invalid gateway public key format");
    }

    if (!this.isValidPublicKey(config.recipient)) {
      throw new Error("Invalid recipient public key format");
    }

    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(config.trackingId)) {
      throw new Error(
        "Invalid trackingId format. Use alphanumeric, underscore, or hyphen (max 64 chars)"
      );
    }
  }

  // Validate checkout session parameters
  static validateCheckoutSessionParams(params: any): void {
    // Validate mode
    if (
      !params.mode ||
      (params.mode !== "payment" && params.mode !== "subscription")
    ) {
      throw new Error('mode must be "payment" or "subscription"');
    }

    // Mode-specific validation
    if (params.mode === "subscription") {
      if (
        !params.line_items ||
        !Array.isArray(params.line_items) ||
        params.line_items.length === 0
      ) {
        throw new Error("line_items is required for subscription mode");
      }

      const validFrequencies = ["daily", "weekly", "monthly", "annually"];
      if (
        params.paymentFrequency &&
        !validFrequencies.includes(params.paymentFrequency)
      ) {
        throw new Error(
          `paymentFrequency is invalid. Must be any of ${JSON.stringify(
            validFrequencies
          )}`
        );
      }
    } else if (params.mode === "payment") {
      // One-time payment mode - line items optional
    }

    if (
      params.payment_method_types &&
      !params.payment_method_types.includes("tributary")
    ) {
      throw new Error('Only "tributary" payment method is supported');
    }

    // Validate line items if present
    if (params.line_items) {
      params.line_items.forEach((item: any, index: number) => {
        if (!item.description) {
          throw new Error(`line_items[${index}].description is required`);
        }

        if (typeof item.unitPrice !== "number" || item.unitPrice <= 0) {
          throw new Error(
            `line_items[${index}].unitPrice must be a positive number`
          );
        }

        if (typeof item.quantity !== "number" || item.quantity <= 0) {
          throw new Error(
            `line_items[${index}].quantity must be a positive number`
          );
        }
      });
    }

    // Validate tributary config if present
    if (params.tributaryConfig) {
      this.validateTributaryConfig(params.tributaryConfig);
    }
  }

  // Basic public key format validation
  private static isValidPublicKey(key: string): boolean {
    // Basic check for Solana public key format (base58, 43-44 chars)
    return /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(key);
  }

  // --------------------------------------------------------------------------
  // Per-variant fail-fast validators (feature tributary-uny8).
  // Mirror the on-chain create-time validators EXACTLY:
  //   programs/tributary/src/policies/{subscription,milestone,pay_as_you_go,
  //   one_time,up_to}.rs
  // Each throws TributaryValidationError on invalid input. `payment` is the
  // ADR-0004 direct transfer (no on-chain validator; amount > 0 is the
  // natural pre-SPL-transfer guard).
  // --------------------------------------------------------------------------

  /**
   * Dispatch a {@link CheckoutParams} arm to its per-variant validator.
   * Called from `session.ts` `encodeUrl()` BEFORE encoding so no blob is
   * ever produced that the chain would reject. (Name differs from the bean
   * pseudocode `validateTributaryConfig` to avoid collision with the legacy
   * validator above.)
   */
  static validatePolicyConfig(params: CheckoutParams): void {
    switch (params.mode) {
      case "subscription":
        return this.validateSubscriptionConfig(params);
      case "milestone":
        return this.validateMilestoneConfig(params);
      case "payAsYouGo":
        return this.validatePayAsYouGoConfig(params);
      case "oneTime":
        return this.validateOneTimeConfig(params);
      case "upTo":
        return this.validateUpToConfig(params);
      case "payment":
        return this.validatePaymentConfig(params);
    }
  }

  /** Mirrors `validate_subscription_policy` (subscription.rs). */
  static validateSubscriptionConfig(cfg: SubscriptionParams): void {
    const amount = toNum(cfg.amount);
    if (!(amount > 0)) {
      throw new TributaryValidationError(
        "subscription",
        "amount",
        "amount must be > 0"
      );
    }

    const freq = parseFrequency(cfg.paymentFrequency);
    if (freq.kind === "custom") {
      const interval = toNum(freq.interval ?? 0);
      if (!(interval > 0)) {
        throw new TributaryValidationError(
          "subscription",
          "paymentFrequency",
          "custom interval must be > 0"
        );
      }
      if (!(interval <= I64_MAX)) {
        throw new TributaryValidationError(
          "subscription",
          "paymentFrequency",
          "custom interval must be <= i64::MAX"
        );
      }
    }

    if (cfg.maxRenewals != null && cfg.maxRenewals <= 0) {
      throw new TributaryValidationError(
        "subscription",
        "maxRenewals",
        "maxRenewals must be > 0 when set"
      );
    }
  }

  /** Mirrors `validate_milestone_policy` (milestone.rs). */
  static validateMilestoneConfig(cfg: MilestoneParams): void {
    const total = cfg.totalMilestones;
    if (!(total >= 1 && total <= 4)) {
      throw new TributaryValidationError(
        "milestone",
        "totalMilestones",
        "totalMilestones must be in 1..=4"
      );
    }
    if (cfg.milestoneAmounts.length < total) {
      throw new TributaryValidationError(
        "milestone",
        "milestoneAmounts",
        `milestoneAmounts must have at least ${total} entries`
      );
    }
    for (let i = 0; i < total; i++) {
      if (!(toNum(cfg.milestoneAmounts[i]) > 0)) {
        throw new TributaryValidationError(
          "milestone",
          `milestoneAmounts[${i}]`,
          "each active milestone amount must be > 0"
        );
      }
    }
    // Signer gates (bits 1-3) mutually exclusive; bit 0 (due-date) independent.
    const signerBits = cfg.releaseCondition & SIGNER_BITS_MASK;
    if (this.popcount(signerBits) > 1) {
      throw new TributaryValidationError(
        "milestone",
        "releaseCondition",
        "signer bits (GATEWAY/OWNER/RECIPIENT) are mutually exclusive"
      );
    }
  }

  /** Mirrors `validate_payg_policy` (pay_as_you_go.rs). */
  static validatePayAsYouGoConfig(cfg: PayAsYouGoParams): void {
    const periodCap = toNum(cfg.maxAmountPerPeriod);
    const chunkCap = toNum(cfg.maxChunkAmount);
    const period = toNum(cfg.periodLengthSeconds);
    if (!(periodCap > 0)) {
      throw new TributaryValidationError(
        "payAsYouGo",
        "maxAmountPerPeriod",
        "maxAmountPerPeriod must be > 0"
      );
    }
    if (!(chunkCap > 0)) {
      throw new TributaryValidationError(
        "payAsYouGo",
        "maxChunkAmount",
        "maxChunkAmount must be > 0"
      );
    }
    if (!(chunkCap <= periodCap)) {
      throw new TributaryValidationError(
        "payAsYouGo",
        "maxChunkAmount",
        "maxChunkAmount must be <= maxAmountPerPeriod"
      );
    }
    if (!(period > 0)) {
      throw new TributaryValidationError(
        "payAsYouGo",
        "periodLengthSeconds",
        "periodLengthSeconds must be > 0"
      );
    }
    if (!(period <= I64_MAX)) {
      throw new TributaryValidationError(
        "payAsYouGo",
        "periodLengthSeconds",
        "periodLengthSeconds must be <= i64::MAX"
      );
    }
  }

  /** Mirrors `validate_one_time_policy` (one_time.rs). */
  static validateOneTimeConfig(cfg: OneTimePolicyParams): void {
    const amount = toNum(cfg.amount);
    if (!(amount > 0)) {
      throw new TributaryValidationError(
        "oneTime",
        "amount",
        "amount must be > 0"
      );
    }
    // Only validate expiry-vs-due ordering when BOTH are meaningful
    // (expiry present and due_date in the future). dueDate <= 0 = immediate.
    if (cfg.expiryDate != null && cfg.dueDate != null && cfg.dueDate > 0) {
      if (!(cfg.expiryDate > cfg.dueDate)) {
        throw new TributaryValidationError(
          "oneTime",
          "expiryDate",
          "expiryDate must be > dueDate"
        );
      }
    }
  }

  /** Mirrors `validate_up_to_policy` (up_to.rs). */
  static validateUpToConfig(cfg: UpToParams): void {
    const maxAmount = toNum(cfg.maxAmount);
    if (!(maxAmount > 0)) {
      throw new TributaryValidationError(
        "upTo",
        "maxAmount",
        "maxAmount must be > 0"
      );
    }
    if (!(cfg.deadline > 0)) {
      throw new TributaryValidationError(
        "upTo",
        "deadline",
        "deadline must be > 0"
      );
    }
    if (cfg.validAfter != null && cfg.validAfter > 0) {
      if (!(cfg.deadline > cfg.validAfter)) {
        throw new TributaryValidationError(
          "upTo",
          "deadline",
          "deadline must be > validAfter (strict)"
        );
      }
    }
  }

  /** Direct SPL transfer (ADR-0004). No on-chain validator; amount > 0 guard. */
  static validatePaymentConfig(cfg: OneTimeParams): void {
    const amount = toNum(cfg.amount);
    if (!(amount > 0)) {
      throw new TributaryValidationError(
        "payment",
        "amount",
        "amount must be > 0"
      );
    }
  }

  private static popcount(n: number): number {
    let c = 0;
    let x = n;
    while (x) {
      c += x & 1;
      x = x >>> 1;
    }
    return c;
  }
}

/** Parse the subscription paymentFrequency field.
 *  Accepts predefined names ("daily".."annually") or "custom:<seconds>". */
function parseFrequency(raw: string): {
  kind: "predefined" | "custom";
  interval?: number;
} {
  if (typeof raw !== "string") return { kind: "predefined" };
  const m = raw.match(/^custom:(.+)$/);
  if (m) return { kind: "custom", interval: Number(m[1]) };
  return { kind: "predefined" };
}
