// Checkout session management

import { TributaryCheckoutSession } from "../types/tributary";
import { ValidationUtils } from "../utils/validation";
import { PublicKey } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";
import { PaymentTracker } from "./tracking";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

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
  lineItems?: LineItem[];
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
  li: string; // lineItems (JSON string)
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

    // Handle line items in new simplified format
    const lineItems: LineItem[] = params.line_items || [];
    const amount =
      lineItems.length > 0
        ? lineItems.reduce(
            (sum: number, item: LineItem) =>
              sum + item.quantity * item.unitPrice,
            0
          )
        : params.tributaryConfig.amount || 0;

    // Extract payment frequency from params or default
    const paymentFrequency = params.paymentFrequency || "monthly";

    // Encode subscription parameters into URL
    const encodedUrl = this.encodeSubscriptionUrl({
      tokenMint:
        params.tributaryConfig.recipient ||
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      recipient: params.tributaryConfig.recipient,
      gateway: params.tributaryConfig.gateway,
      amount,
      autoRenew: params.mode === "subscription",
      maxRenewals: null,
      paymentFrequency,
      startTime: null,
      trackingId:
        params.tributaryConfig.trackingId ||
        params.metadata?.tracking_id ||
        sessionId,
      lineItems,
    });

    // Create Tributary-compatible response
    const session: TributaryCheckoutSession = {
      id: sessionId,
      object: "checkout.session",
      payment_method_types: params.payment_method_types || ["tributary"],
      line_items: lineItems,
      mode: params.mode,
      success_url: params.success_url,
      cancel_url: params.cancel_url,
      payment_status: "unpaid",
      status: "open",
      amount_total: amount,
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
      li: params.lineItems ? JSON.stringify(params.lineItems) : "[]",
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
      console.error(error);
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

    // Parse line items if present
    let lineItems: LineItem[] | undefined;
    if (data.li && data.li !== "[]") {
      try {
        lineItems = JSON.parse(data.li);
      } catch (error) {
        console.warn("Failed to parse line items, using empty array");
        lineItems = undefined;
      }
    }

    return {
      tokenMint: data.tm,
      recipient: data.r,
      gateway: data.g,
      amount,
      autoRenew: data.ar === true,
      maxRenewals: data.mr === "null" ? null : parseInt(data.mr),
      paymentFrequency: data.pf,
      startTime: data.st === "null" ? null : parseInt(data.st),
      trackingId: data.tid,
      lineItems,
    };
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
