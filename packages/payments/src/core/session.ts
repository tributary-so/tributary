// Checkout session management

import { TributaryCheckoutSession } from "../types/tributary";
import { ValidationUtils } from "../utils/validation";
import { PublicKey } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";
import {
  PaymentTracker,
  PolicyLookupOptions,
  SubscriptionStatus,
} from "./tracking";

export interface SubscriptionParams {
  tokenMint: string;
  recipient: string;
  gateway: string;
  amount: number;
  autoRenew: boolean;
  maxRenewals: number | null;
  paymentFrequency: string;
  startTime?: number | null;
  trackingId?: string;
}

export interface EncodedSessionData {
  // Core subscription parameters
  tm: string; // tokenMint (base58)
  r: string; // recipient (base58)
  g: string; // gateway (base58)
  a: string; // amount (string number)
  ar: boolean; // autoRenew
  mr: string; // maxRenewals (string number or "null")
  pf: string; // paymentFrequency
  st: string; // startTime (timestamp or "null")
  tid: string; // trackingId
}

export class CheckoutSessionManager {
  private readonly BASE_URL = "https://checkout.tributary.so";
  private connection: Connection;
  private tracker: PaymentTracker | null;

  constructor(connection?: Connection, tributary?: Tributary) {
    this.connection =
      connection || new Connection("https://api.mainnet-beta.solana.com");
    this.tracker = tributary
      ? new PaymentTracker(this.connection, tributary)
      : null;
  }

  // Create checkout session with encoded URL
  async create(params: any): Promise<TributaryCheckoutSession> {
    // Validate input parameters
    ValidationUtils.validateCheckoutSessionParams(params);

    // Generate session ID
    const sessionId = this.generateSessionId();

    // Encode subscription parameters into URL
    const encodedUrl = this.encodeSubscriptionUrl({
      tokenMint:
        params.tributaryConfig.recipient ||
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      recipient: params.tributaryConfig.recipient,
      gateway: params.tributaryConfig.gateway,
      amount: this.calculateTotalAmount(params.line_items),
      autoRenew: params.mode === "subscription",
      maxRenewals: null, // Default to unlimited
      paymentFrequency: this.mapIntervalToFrequency(
        params.line_items[0]?.price_data?.recurring?.interval || "month"
      ),
      startTime: null,
      trackingId: params.metadata?.tracking_id || sessionId,
    });

    // Create Tributary-compatible response
    const session: TributaryCheckoutSession = {
      id: sessionId,
      object: "checkout.session",
      payment_method_types: params.payment_method_types || ["tributary"],
      line_items: params.line_items,
      mode: params.mode,
      success_url: params.success_url,
      cancel_url: params.cancel_url,
      payment_status: "unpaid",
      status: "open",
      amount_total: this.calculateTotalAmount(params.line_items),
      currency: "usd",
      metadata: params.metadata || {},
      tributaryConfig: params.tributaryConfig,
      url: encodedUrl,
    };

    return session;
  }

  // Encode subscription parameters into compact URL
  encodeSubscriptionUrl(params: SubscriptionParams): string {
    const data: EncodedSessionData = {
      tm: params.tokenMint,
      r: params.recipient,
      g: params.gateway,
      a: params.amount.toString(),
      ar: params.autoRenew,
      mr: params.maxRenewals?.toString() || "null",
      pf: params.paymentFrequency,
      st: params.startTime?.toString() || "null",
      tid: params.trackingId || this.generateTrackingId(),
    };

    // Use Base64URL encoding (compact and URL-safe)
    const encoded = this.encodeAsBase64Url(data);

    return `${this.BASE_URL}/subscribe/${encoded}`;
  }

  // Decode subscription parameters from URL
  decodeSubscriptionUrl(encodedData: string): SubscriptionParams {
    // Try Base64URL decoding first
    try {
      const data = this.decodeFromBase64Url(encodedData);
      return this.validateDecodedData(data);
    } catch (error) {
      throw new Error("Invalid session data encoding");
    }
  }

  // Base64URL encoding (URL-safe, compact)
  private encodeAsBase64Url(data: EncodedSessionData): string {
    const jsonString = JSON.stringify(data);
    const base64 = Buffer.from(jsonString).toString("base64");
    // Make it URL-safe
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  private decodeFromBase64Url(encoded: string): EncodedSessionData {
    // Add padding back if needed
    const padding = encoded.length % 4;
    const base64 = encoded + "=".repeat(padding === 0 ? 0 : 4 - padding);
    // Convert back from URL-safe
    const standardBase64 = base64.replace(/-/g, "+").replace(/_/g, "/");
    const jsonString = Buffer.from(standardBase64, "base64").toString("utf8");
    return JSON.parse(jsonString);
  }

  // Map Tributary interval to Tributary payment frequency
  private mapIntervalToFrequency(interval: string): string {
    const mapping: Record<string, string> = {
      day: "daily",
      week: "weekly",
      month: "monthly",
      year: "annually",
    };
    return mapping[interval] || "monthly";
  }

  // Convert Tributary frequency back to Tributary interval
  private frequencyToInterval(
    frequency: string
  ): "month" | "day" | "week" | "year" {
    const mapping: Record<string, "month" | "day" | "week" | "year"> = {
      daily: "day",
      weekly: "week",
      monthly: "month",
      annually: "year",
    };
    return mapping[frequency] || "month";
  }

  // Generate unique tracking ID
  private generateTrackingId(): string {
    return `trib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Validate decoded data
  private validateDecodedData(data: any): SubscriptionParams {
    // Validate required fields
    if (!data.tm || !data.r || !data.g || !data.a) {
      throw new Error("Missing required fields in session data");
    }

    // Validate public keys
    try {
      new PublicKey(data.tm);
      new PublicKey(data.r);
      new PublicKey(data.g);
    } catch (error) {
      throw new Error("Invalid public key format");
    }

    // Validate amount
    const amount = parseInt(data.a);
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Invalid amount");
    }

    // Validate payment frequency
    const validFrequencies = ["daily", "weekly", "monthly", "annually"];
    if (!validFrequencies.includes(data.pf)) {
      throw new Error("Invalid payment frequency");
    }

    return {
      tokenMint: data.tm,
      recipient: data.r,
      gateway: data.g,
      amount: amount,
      autoRenew: data.ar === true,
      maxRenewals: data.mr === "null" ? null : parseInt(data.mr),
      paymentFrequency: data.pf,
      startTime: data.st === "null" ? null : parseInt(data.st),
      trackingId: data.tid,
    };
  }

  // Retrieve checkout session with real Tributary status
  async retrieve(sessionId: string): Promise<TributaryCheckoutSession> {
    if (!this.tracker) {
      throw new Error(
        "Tributary SDK instance required for session retrieval. Please provide connection and tributary instances to CheckoutSessionManager constructor."
      );
    }

    try {
      // Try to find the subscription by tracking ID (sessionId)
      // First attempt: Try to extract session data from the sessionId itself
      // This handles cases where sessionId is actually a tracking ID
      let subscriptionStatus: SubscriptionStatus | null = null;
      let sessionData: any = null;

      // Try different lookup strategies
      const lookupStrategies: PolicyLookupOptions[] = [];

      // Strategy 1: If sessionId looks like a tracking ID, try direct lookup
      if (sessionId.startsWith("trib_") || sessionId.length < 100) {
        // This is likely a tracking ID, not an encoded session
        // We need context to know which user or gateway to look up
        // For now, we'll return a basic session indicating it needs more context
        return this.createSessionFromTrackingId(sessionId);
      }

      // Strategy 2: Try to decode as Base64URL session data
      try {
        const decodedParams = this.decodeSubscriptionUrl(sessionId);
        // If successful, we have the session data and can try to look up the actual policy
        sessionData = decodedParams;

        // Try user-based lookup first
        lookupStrategies.push({
          userPublicKey: decodedParams.recipient,
          tokenMint: decodedParams.tokenMint,
        });

        // Try gateway-based lookup as fallback
        lookupStrategies.push({
          gatewayPublicKey: decodedParams.gateway,
        });
      } catch (decodeError) {
        // Not a valid encoded session, treat as tracking ID
        return this.createSessionFromTrackingId(sessionId);
      }

      // Try each lookup strategy until we find the subscription
      for (const lookupOptions of lookupStrategies) {
        try {
          subscriptionStatus = await this.tracker!.checkInitialStatus(
            sessionData.trackingId,
            lookupOptions
          );

          if (subscriptionStatus.subscriptionCreated) {
            return this.createActiveSession(
              sessionId,
              sessionData,
              subscriptionStatus
            );
          }
        } catch (lookupError) {
          // Continue to next strategy
          console.debug(`Lookup strategy failed:`, lookupError);
        }
      }
    } catch (error) {
      // If all lookup strategies fail, return a basic session
      console.debug("Session retrieval failed:", error);
      throw new Error(`Error retreiving session`);
    }

    throw new Error(`No session could be found`);
  }

  // Create session when we only have a tracking ID (limited info)
  private createSessionFromTrackingId(
    trackingId: string
  ): TributaryCheckoutSession {
    return {
      id: trackingId,
      object: "checkout.session",
      payment_method_types: ["tributary"],
      line_items: [],
      mode: "subscription",
      payment_status: "unpaid",
      status: "open", // Still waiting for subscription creation
      amount_total: 0,
      currency: "usd",
      metadata: {
        tracking_id: trackingId,
        note: "Tracking ID found - provide user or gateway context for full status",
      },
    };
  }

  // Create session for active subscriptions
  private createActiveSession(
    sessionId: string,
    sessionData: any,
    status: SubscriptionStatus
  ): TributaryCheckoutSession {
    const paymentStatus = status.status === "active" ? "paid" : "unpaid";
    const sessionStatus = status.status === "active" ? "complete" : "open";

    return {
      id: sessionId,
      object: "checkout.session",
      payment_method_types: ["tributary"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: sessionData.amount,
            product_data: {
              name: "Tributary Subscription",
              description: `${sessionData.paymentFrequency} subscription`,
            },
            recurring: {
              interval: this.frequencyToInterval(sessionData.paymentFrequency),
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      payment_status: paymentStatus,
      status: sessionStatus,
      amount_total: sessionData.amount,
      currency: "usd",
      metadata: {
        tracking_id: sessionData.trackingId,
        payment_count: status.paymentCount.toString(),
        next_payment_due: status.nextPaymentDue?.toString() || "",
        subscription_created: status.subscriptionCreated.toString(),
        initial_payment_executed: status.initialPaymentExecuted.toString(),
      },
      tributaryConfig: {
        recipient: sessionData.recipient,
        gateway: sessionData.gateway,
        trackingId: sessionData.trackingId,
        autoRenew: sessionData.autoRenew,
      },
    };
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Calculate total amount from line items
  private calculateTotalAmount(lineItems: any[]): number {
    return lineItems.reduce((total, item) => {
      const amount = item.price_data.unit_amount;
      const quantity = item.quantity || 1;
      return total + amount * quantity;
    }, 0);
  }
}
