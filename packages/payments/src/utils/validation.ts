// Input validation utilities

import { TributaryConfig } from "../types/tributary";
import { MemoUtils } from "./memo";

export class ValidationUtils {
  // Validate Tributary configuration
  static validateTributaryConfig(config: TributaryConfig): void {
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

    if (!MemoUtils.validateTrackingId(config.trackingId)) {
      throw new Error(
        "Invalid trackingId format. Use alphanumeric, underscore, or hyphen (max 64 chars)"
      );
    }
  }

  // Validate checkout session parameters
  static validateCheckoutSessionParams(params: any): void {
    if (
      !params.line_items ||
      !Array.isArray(params.line_items) ||
      params.line_items.length === 0
    ) {
      throw new Error("line_items is required and must be a non-empty array");
    }

    if (
      !params.mode ||
      (params.mode !== "payment" && params.mode !== "subscription")
    ) {
      throw new Error('mode must be "payment" or "subscription"');
    }

    if (
      params.payment_method_types &&
      !params.payment_method_types.includes("tributary")
    ) {
      throw new Error('Only "tributary" payment method is supported');
    }

    // Validate line items
    params.line_items.forEach((item: any, index: number) => {
      if (!item.price_data) {
        throw new Error(`line_items[${index}].price_data is required`);
      }

      if (item.price_data.currency !== "usd") {
        throw new Error(
          `line_items[${index}].price_data.currency must be "usd"`
        );
      }

      if (!item.price_data.product_data?.name) {
        throw new Error(
          `line_items[${index}].price_data.product_data.name is required`
        );
      }

      if (
        typeof item.price_data.unit_amount !== "number" ||
        item.price_data.unit_amount <= 0
      ) {
        throw new Error(
          `line_items[${index}].price_data.unit_amount must be a positive number`
        );
      }
    });

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
}
