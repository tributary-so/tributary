// Stripe ↔ Tributary conversion utilities

import {
  StripeCheckoutSession,
  StripeSubscription,
  TributaryConfig,
  PaymentTransaction,
} from "../types/stripe";
import { MemoUtils } from "./memo";

export class StripeTributaryConverter {
  // USDC mint address on Solana
  private static readonly USDC_MINT =
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

  // Stripe Checkout Session → Tributary Session
  static stripeSessionToTributary(
    session: StripeCheckoutSession
  ): TributarySession {
    if (!session.tributaryConfig) {
      throw new Error("tributaryConfig is required for Tributary conversion");
    }

    const lineItem = session.line_items[0];
    if (!lineItem) {
      throw new Error("At least one line item is required");
    }

    return {
      sessionId: session.id,
      gateway: session.tributaryConfig.gateway,
      recipient: session.tributaryConfig.recipient,
      tokenMint: this.USDC_MINT,
      amount: this.parseAmount(
        session.amount_total || lineItem.price_data.unit_amount
      ),
      currency: session.currency || "usd",
      paymentFrequency: this.convertFrequency(
        lineItem.price_data.recurring?.interval
      ),
      autoRenew: session.tributaryConfig.autoRenew ?? true,
      trackingId: session.tributaryConfig.trackingId,
      memo: this.buildMemo(session.tributaryConfig),
      productName: lineItem.price_data.product_data.name,
      productDescription: lineItem.price_data.product_data.description,
    };
  }

  // Build MEMO field with tracking ID
  static buildMemo(tributaryConfig: TributaryConfig): string {
    const baseMemo = tributaryConfig.memo || "";
    const trackingMemo = `tributary:tracking:${tributaryConfig.trackingId}`;

    return baseMemo ? `${baseMemo} | ${trackingMemo}` : trackingMemo;
  }

  // Convert amount from cents to lamports (USDC has 6 decimals)
  static parseAmount(amount: number): number {
    return amount * 10000; // Convert cents to USDC units (6 decimals)
  }

  // Convert Stripe frequency to Tributary frequency
  static convertFrequency(interval?: string): string {
    switch (interval) {
      case "day":
        return "daily";
      case "week":
        return "weekly";
      case "month":
        return "monthly";
      case "year":
        return "yearly";
      default:
        return "monthly";
    }
  }

  // Convert Tributary frequency to Stripe frequency
  static convertFrequencyToString(
    frequency?: string
  ): "day" | "week" | "month" | "year" {
    switch (frequency) {
      case "daily":
        return "day";
      case "weekly":
        return "week";
      case "monthly":
        return "month";
      case "yearly":
        return "year";
      default:
        return "month";
    }
  }

  // Convert Tributary Payment Policy → Stripe Subscription
  static tributaryPolicyToStripe(policy: any): StripeSubscription {
    return {
      id: policy.publicKey?.toString() || "",
      object: "subscription",
      customer: policy.userPayment?.toString() || "",
      status: this.convertPolicyStatus(policy.status),
      current_period_start: (policy.nextPaymentDue?.toNumber() || 0) * 1000,
      current_period_end: this.calculatePeriodEnd(policy),
      items: [
        {
          id: "default",
          object: "subscription_item",
          price: {
            id: "custom-price",
            object: "price",
            currency: "usd",
            unit_amount:
              this.tributaryAmountToStripe(
                policy.policyType?.subscription?.amount
              ) || 0,
            recurring: {
              interval: this.convertFrequencyToString(
                policy.policyType?.subscription?.paymentFrequency
              ),
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tributary_policy_id: policy.publicKey?.toString() || "",
        user_payment_id: policy.userPayment?.toString() || "",
        tracking_id: this.extractTrackingIdFromMemo(policy.memo),
      },
    };
  }

  // Convert Tributary amount to Stripe amount (lamports to cents)
  static tributaryAmountToStripe(amount?: any): number {
    if (!amount) return 0;
    const lamports = amount.toNumber?.() || Number(amount);
    return Math.floor(lamports / 10000); // Convert USDC units to cents
  }

  // Convert policy status to Stripe subscription status
  static convertPolicyStatus(
    status?: string
  ):
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "paused" {
    switch (status) {
      case "active":
        return "active";
      case "paused":
        return "paused";
      case "cancelled":
        return "canceled";
      case "past_due":
        return "past_due";
      default:
        return "incomplete";
    }
  }

  // Calculate period end timestamp
  static calculatePeriodEnd(policy: any): number {
    const start = policy.nextPaymentDue?.toNumber?.() || 0;
    const frequency = policy.policyType?.subscription?.paymentFrequency;

    let intervalMs = 30 * 24 * 60 * 60 * 1000; // Default: 30 days in ms

    switch (frequency) {
      case "daily":
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      case "weekly":
        intervalMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case "yearly":
        intervalMs = 365 * 24 * 60 * 60 * 1000;
        break;
    }

    return start * 1000 + intervalMs;
  }

  // Extract tracking ID from MEMO
  static extractTrackingIdFromMemo(memo?: string): string {
    return MemoUtils.extractTrackingId(memo || "") || "";
  }

  // Convert Solana transaction to PaymentTransaction
  static solanaTransactionToPayment(
    tx: any,
    recipient: string
  ): PaymentTransaction {
    return {
      signature: tx.signature || "",
      timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
      amount: this.extractTransactionAmount(tx),
      recipient: recipient,
      memo: tx.memo || "",
      trackingId: MemoUtils.extractTrackingId(tx.memo || "") || undefined,
    };
  }

  // Extract amount from transaction (simplified)
  private static extractTransactionAmount(tx: any): number {
    // This is a simplified implementation
    // In reality, you'd parse the transaction to find the token transfer amount
    return 0; // Placeholder
  }
}

// Internal Tributary session type
interface TributarySession {
  sessionId: string;
  gateway: string;
  recipient: string;
  tokenMint: string;
  amount: number;
  currency: string;
  paymentFrequency: string;
  autoRenew: boolean;
  trackingId: string;
  memo: string;
  productName: string;
  productDescription?: string;
}
