// Checkout session management

import { TributaryCheckoutSession } from "../types/tributary";
import { ValidationUtils } from "../utils/validation";
import { PublicKey } from "@solana/web3.js";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface SubscriptionParams {
  mode: "subscription";
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
  successUrl?: string;
  cancelUrl?: string;
}

export interface OneTimeParams {
  mode: "payment";
  tokenMint: string;
  recipient: string;
  amount: number;
  trackingId?: string;
  memo?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export type CheckoutParams = SubscriptionParams | OneTimeParams;

export interface EncodedSessionData {
  m: "subscription" | "payment"; // mode
  tm: string; // tokenMint (base58)
  r: string; // recipient (base58)
  g?: string; // gateway (base58) - subscription only
  a: string; // amount (string number)
  ar?: boolean; // autoRenew - subscription only
  mr?: string; // maxRenewals (string number or "null") - subscription only
  pf?: string; // paymentFrequency - subscription only
  st?: string; // startTime (timestamp or "null") - subscription only
  tid: string; // trackingId
  li?: string; // lineItems (JSON string) - subscription only
  memo?: string; // custom memo - one-time only
  su: string; // successUrl or "null"
  cu: string; // cancelUrl or "null"
}

export class CheckoutSessionManager {
  private BASE_URL = "https://checkout.tributary.so";
  // private tracker: PaymentTracker | null;

  constructor() {}

  public setBaseUrl(url: string) {
    this.BASE_URL = url;
  }

  // Create checkout session with encoded URL
  async create(params: any): Promise<TributaryCheckoutSession> {
    // FIXME: DEPRECATED!
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
      mode: "subscription",
      tokenMint: params.tributaryConfig.tokenMint,
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
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
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

  // Encode checkout parameters into compact URL
  encodeUrl(params: CheckoutParams): string {
    const data: EncodedSessionData = {
      m: params.mode,
      tm: params.tokenMint,
      r: params.recipient,
      a: params.amount.toString(),
      tid: params.trackingId || this.generateTrackingId(),
      su: params.successUrl || "null",
      cu: params.cancelUrl || "null",
    };

    if (params.mode === "subscription") {
      data.g = params.gateway;
      data.ar = params.autoRenew;
      data.mr = params.maxRenewals?.toString() || "null";
      data.pf = params.paymentFrequency;
      data.st = params.startTime?.toString() || "null";
      data.li = params.lineItems ? JSON.stringify(params.lineItems) : "[]";
    } else if (params.mode === "payment") {
      data.memo = params.memo;
    }

    // Use Base64URL encoding (compact and URL-safe)
    const encoded = this.encodeAsBase64Url(data);

    return params.mode === "subscription"
      ? `${this.BASE_URL}/subscribe/${encoded}`
      : `${this.BASE_URL}/pay/${encoded}`;
  }

  // Decode subscription parameters from URL
  decodeUrl(encodedData: string): CheckoutParams {
    // Try Base64URL decoding first
    try {
      const data = this.decodeFromBase64Url(encodedData);
      return this.validateDecodedData(data);
    } catch (err) {
      const error = err as Error;
      throw new Error(`Invalid session data encoding: ${error.message}`);
    }
  }

  // Encode subscription parameters into compact URL (legacy, for backward compat)
  encodeSubscriptionUrl(params: SubscriptionParams): string {
    return this.encodeUrl(params);
  }

  decodeSubscriptionUrl(encodedData: string): CheckoutParams {
    return this.decodeUrl(encodedData);
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

  // Generate unique tracking ID
  private generateTrackingId(): string {
    return `trib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Validate decoded data
  private validateDecodedData(data: any): SubscriptionParams | OneTimeParams {
    // Validate required common fields
    if (!data.tm || !data.r || !data.a || !data.m) {
      throw new Error("Missing required fields in session data");
    }

    // Validate public keys
    try {
      new PublicKey(data.tm);
      new PublicKey(data.r);
      if (data.g) new PublicKey(data.g);
    } catch (error) {
      throw new Error("Invalid public key format");
    }

    // Validate amount
    const amount = parseFloat(data.a);
    if (isNaN(amount) || amount <= 0) {
      throw new Error(`Invalid amount (${amount})`);
    }

    // Handle based on mode
    if (data.m === "subscription") {
      if (!data.g) {
        throw new Error("Missing required gateway for subscription");
      }

      // Validate payment frequency
      const validFrequencies = ["daily", "weekly", "monthly", "annually"];
      if (!validFrequencies.includes(data.pf)) {
        throw new Error(`Invalid payment frequency (${data.pf})!`);
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
        mode: "subscription",
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
        successUrl: data.su === "null" ? undefined : data.su,
        cancelUrl: data.cu === "null" ? undefined : data.cu,
      };
    } else if (data.m === "payment") {
      return {
        mode: "payment",
        tokenMint: data.tm,
        recipient: data.r,
        amount,
        trackingId: data.tid,
        memo: data.memo,
        successUrl: data.su === "null" ? undefined : data.su,
        cancelUrl: data.cu === "null" ? undefined : data.cu,
      };
    } else {
      throw new Error(`Invalid mode (${data.m})`);
    }
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
