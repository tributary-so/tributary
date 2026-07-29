// Checkout session management

import { TributaryCheckoutSession } from "../types/tributary";
import { ValidationUtils } from "../utils/validation";
import { PublicKey } from "@solana/web3.js";
interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Solana cluster the checkout link is valid for. Encoded into the URL blob so
 * the paying side knows which network to talk to. Defaults to "mainnet" when
 * absent (backward compat with links minted before this field existed).
 */
export type Cluster = "mainnet" | "devnet" | "testnet";

export const DEFAULT_CLUSTER: Cluster = "mainnet";

const ALLOWED_CLUSTERS: readonly Cluster[] = ["mainnet", "devnet", "testnet"];

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
  memo?: string;
  successUrl?: string;
  cancelUrl?: string;
  /** Cluster the link is valid for. Omit → "mainnet". */
  cluster?: Cluster;
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
  /** Cluster the link is valid for. Omit → "mainnet". */
  cluster?: Cluster;
}

/** Milestone policy (1-4 escrowed milestones, bitmap release condition). */
export interface MilestoneParams {
  mode: "milestone";
  tokenMint: string;
  recipient: string;
  gateway: string;
  milestoneAmounts: Array<number | string>;
  milestoneTimestamps: number[];
  releaseCondition: number;
  totalMilestones: number;
  trackingId?: string;
  memo?: string;
  successUrl?: string;
  cancelUrl?: string;
  cluster?: Cluster;
}

/** Pay-as-you-go policy (per-period cap + chunk cap). */
export interface PayAsYouGoParams {
  mode: "payAsYouGo";
  tokenMint: string;
  recipient: string;
  gateway: string;
  maxAmountPerPeriod: number | string;
  maxChunkAmount: number | string;
  periodLengthSeconds: number | string;
  trackingId?: string;
  memo?: string;
  successUrl?: string;
  cancelUrl?: string;
  cluster?: Cluster;
}

/** OneTime PaymentPolicy variant (ADR-0019) — distinct from OneTimeParams (direct transfer). */
export interface OneTimePolicyParams {
  mode: "oneTime";
  tokenMint: string;
  recipient: string;
  gateway: string;
  amount: number | string;
  /** <=0 / omitted = immediately executable. */
  dueDate?: number;
  /** Omitted = never expires. */
  expiryDate?: number;
  trackingId?: string;
  memo?: string;
  successUrl?: string;
  cancelUrl?: string;
  cluster?: Cluster;
}

/** UpTo policy variant (ADR-0020) — single-use variable-amount authorization. */
export interface UpToParams {
  mode: "upTo";
  tokenMint: string;
  recipient: string;
  gateway: string;
  maxAmount: number | string;
  /** <=0 / omitted = immediate. */
  validAfter?: number;
  /** Mandatory, >0, > validAfter. */
  deadline: number;
  trackingId?: string;
  memo?: string;
  successUrl?: string;
  cancelUrl?: string;
  cluster?: Cluster;
}

export type CheckoutParams =
  | SubscriptionParams
  | OneTimeParams
  | MilestoneParams
  | PayAsYouGoParams
  | OneTimePolicyParams
  | UpToParams;

/**
 * Full discriminator union mirroring {@link CheckoutParams.mode}. Encoded
 * into the URL blob's `m` field (milestone Axis 4). URL path is derivable
 * from `m` (Axis 3): subscription→/subscribe/, payment→/pay/, others→/policy/.
 */
export type SessionMode =
  | "subscription"
  | "payment"
  | "milestone"
  | "payAsYouGo"
  | "oneTime"
  | "upTo";

const POLICY_MODES: readonly SessionMode[] = [
  "subscription",
  "milestone",
  "payAsYouGo",
  "oneTime",
  "upTo",
];

function isSessionMode(value: unknown): value is SessionMode {
  return (
    typeof value === "string" &&
    ([...POLICY_MODES, "payment"] as readonly string[]).includes(value)
  );
}

/** URL path segment for a given mode (Axis 3). */
function pathForMode(m: SessionMode): string {
  if (m === "subscription") return "/subscribe/";
  if (m === "payment") return "/pay/";
  return "/policy/"; // milestone, payAsYouGo, oneTime, upTo
}

export interface EncodedSessionData {
  m: SessionMode; // mode / discriminator
  tm: string; // tokenMint (base58)
  r: string; // recipient (base58)
  g?: string; // gateway (base58) — all policy variants, NOT direct-transfer payment
  a?: string; // canonical single amount (subscription/oneTime/payment)
  ar?: boolean; // autoRenew — subscription only
  mr?: string; // maxRenewals ("null" or string number) — subscription only
  pf?: string; // paymentFrequency — subscription only
  st?: string; // startTime ("null" or timestamp) — subscription only
  tid: string; // trackingId
  li?: string; // lineItems (JSON string) — subscription only
  memo?: string; // custom memo — payment / oneTime / others
  su: string; // successUrl or "null"
  cu: string; // cancelUrl or "null"
  c?: Cluster; // cluster - defaults to "mainnet" when absent
  // milestone
  ma?: string; // milestoneAmounts (JSON string of number/string[])
  mt?: string; // milestoneTimestamps (JSON string of number[])
  rc?: string; // releaseCondition (string number)
  tn?: string; // totalMilestones (string number)
  // payAsYouGo
  mp?: string; // maxAmountPerPeriod (string number)
  mc?: string; // maxChunkAmount (string number)
  pl?: string; // periodLengthSeconds (string number)
  // oneTime policy
  dd?: string; // dueDate ("null" or timestamp)
  ed?: string; // expiryDate ("null" or timestamp)
  // upto
  xm?: string; // maxAmount (string number)
  va?: string; // validAfter ("null" or timestamp)
  dl?: string; // deadline (string timestamp)
}

export class CheckoutSessionManager {
  private BASE_URL = "https://checkout.tributary.so";
  // private tracker: PaymentPolicyTracker | null;

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
    // Fail fast: reject inputs the chain would reject BEFORE producing a blob.
    ValidationUtils.validatePolicyConfig(params);

    const data: EncodedSessionData = {
      m: params.mode,
      tm: params.tokenMint,
      r: params.recipient,
      tid: params.trackingId || this.generateTrackingId(),
      su: params.successUrl || "null",
      cu: params.cancelUrl || "null",
      c: params.cluster ?? DEFAULT_CLUSTER,
    };

    // All policy variants carry a gateway; the direct-transfer `payment` mode does not.
    if (params.mode !== "payment") {
      data.g = params.gateway;
    }

    switch (params.mode) {
      case "subscription":
        data.a = params.amount.toString();
        data.ar = params.autoRenew;
        data.mr = params.maxRenewals?.toString() || "null";
        data.pf = params.paymentFrequency;
        data.st = params.startTime?.toString() || "null";
        data.li = params.lineItems ? JSON.stringify(params.lineItems) : "[]";
        if (params.memo) data.memo = params.memo;
        break;
      case "payment":
        data.a = params.amount.toString();
        if (params.memo) data.memo = params.memo;
        break;
      case "milestone":
        data.ma = JSON.stringify(params.milestoneAmounts);
        data.mt = JSON.stringify(params.milestoneTimestamps);
        data.rc = params.releaseCondition.toString();
        data.tn = params.totalMilestones.toString();
        if (params.memo) data.memo = params.memo;
        break;
      case "payAsYouGo":
        data.mp = params.maxAmountPerPeriod.toString();
        data.mc = params.maxChunkAmount.toString();
        data.pl = params.periodLengthSeconds.toString();
        if (params.memo) data.memo = params.memo;
        break;
      case "oneTime":
        data.a = params.amount.toString();
        data.dd = params.dueDate == null ? "null" : params.dueDate.toString();
        data.ed =
          params.expiryDate == null ? "null" : params.expiryDate.toString();
        if (params.memo) data.memo = params.memo;
        break;
      case "upTo":
        data.xm = params.maxAmount.toString();
        data.va =
          params.validAfter == null ? "null" : params.validAfter.toString();
        data.dl = params.deadline.toString();
        if (params.memo) data.memo = params.memo;
        break;
    }

    // Use Base64URL encoding (compact and URL-safe)
    const encoded = this.encodeAsBase64Url(data);

    return `${this.BASE_URL}${pathForMode(params.mode)}${encoded}`;
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

  // Validate + parse decoded data into the right CheckoutParams arm.
  // NOTE: validation here is STRUCTURAL (required fields present, parseable).
  // Full fail-fast per-variant rules mirroring the on-chain validators land
  // in feature tributary-uny8 (ValidationUtils.validatePolicyVariant).
  private validateDecodedData(data: any): CheckoutParams {
    if (!data || !data.tm || !data.r || !data.m) {
      throw new Error("Missing required fields in session data");
    }

    if (!isSessionMode(data.m)) {
      throw new Error(`Invalid mode (${data.m})`);
    }
    const m = data.m as SessionMode;

    // Validate public keys (gateway optional only for direct-transfer payment)
    try {
      new PublicKey(data.tm);
      new PublicKey(data.r);
      if (data.g) new PublicKey(data.g);
    } catch {
      throw new Error("Invalid public key format");
    }

    // Resolve cluster — default to mainnet for links predating this field.
    const cluster: Cluster = ALLOWED_CLUSTERS.includes(data.c)
      ? data.c
      : DEFAULT_CLUSTER;

    const successUrl = data.su === "null" ? undefined : data.su;
    const cancelUrl = data.cu === "null" ? undefined : data.cu;
    const trackingId = data.tid;
    const memo = data.memo;

    switch (m) {
      case "subscription": {
        this.requireGateway(data, m);
        const validFrequencies = ["daily", "weekly", "monthly", "annually"];
        if (!validFrequencies.includes(data.pf)) {
          throw new Error(`Invalid payment frequency (${data.pf})!`);
        }
        const lineItems: LineItem[] | undefined =
          data.li != null ? this.parseLineItems(data.li) : undefined;
        return {
          mode: "subscription",
          tokenMint: data.tm,
          recipient: data.r,
          gateway: data.g,
          amount: this.parseAmount(data.a),
          autoRenew: data.ar === true,
          maxRenewals: data.mr === "null" ? null : parseInt(data.mr),
          paymentFrequency: data.pf,
          startTime: data.st === "null" ? null : parseInt(data.st),
          trackingId,
          lineItems,
          successUrl,
          cancelUrl,
          cluster,
        };
      }
      case "payment": {
        return {
          mode: "payment",
          tokenMint: data.tm,
          recipient: data.r,
          amount: this.parseAmount(data.a),
          trackingId,
          memo,
          successUrl,
          cancelUrl,
          cluster,
        };
      }
      case "milestone": {
        this.requireGateway(data, m);
        return {
          mode: "milestone",
          tokenMint: data.tm,
          recipient: data.r,
          gateway: data.g,
          milestoneAmounts: this.parseJson(data.ma, "milestoneAmounts"),
          milestoneTimestamps: this.parseJson(data.mt, "milestoneTimestamps"),
          releaseCondition: parseInt(data.rc),
          totalMilestones: parseInt(data.tn),
          trackingId,
          memo,
          successUrl,
          cancelUrl,
          cluster,
        };
      }
      case "payAsYouGo": {
        this.requireGateway(data, m);
        return {
          mode: "payAsYouGo",
          tokenMint: data.tm,
          recipient: data.r,
          gateway: data.g,
          maxAmountPerPeriod: this.parseAmount(data.mp),
          maxChunkAmount: this.parseAmount(data.mc),
          periodLengthSeconds: this.parseAmount(data.pl),
          trackingId,
          memo,
          successUrl,
          cancelUrl,
          cluster,
        };
      }
      case "oneTime": {
        this.requireGateway(data, m);
        return {
          mode: "oneTime",
          tokenMint: data.tm,
          recipient: data.r,
          gateway: data.g,
          amount: this.parseAmount(data.a),
          dueDate: this.parseOptionalInt(data.dd),
          expiryDate: this.parseOptionalInt(data.ed),
          trackingId,
          memo,
          successUrl,
          cancelUrl,
          cluster,
        };
      }
      case "upTo": {
        this.requireGateway(data, m);
        return {
          mode: "upTo",
          tokenMint: data.tm,
          recipient: data.r,
          gateway: data.g,
          maxAmount: this.parseAmount(data.xm),
          validAfter: this.parseOptionalInt(data.va),
          deadline: parseInt(data.dl),
          trackingId,
          memo,
          successUrl,
          cancelUrl,
          cluster,
        };
      }
    }
  }

  private requireGateway(data: any, m: SessionMode): void {
    if (!data.g) {
      throw new Error(`Missing required gateway for ${m}`);
    }
  }

  private parseAmount(raw: string): number {
    const n = Number(raw);
    if (!isFinite(n)) {
      throw new Error(`Invalid amount (${raw})`);
    }
    return n;
  }

  private parseOptionalInt(raw: string | undefined): number | undefined {
    if (raw == null || raw === "null") return undefined;
    const n = parseInt(raw);
    if (isNaN(n)) throw new Error(`Invalid optional int (${raw})`);
    return n;
  }

  private parseJson(raw: string | undefined, field: string): any {
    if (raw == null) {
      throw new Error(`Missing required field ${field}`);
    }
    try {
      return JSON.parse(raw);
    } catch (err) {
      throw new Error(`Invalid ${field} encoding: ${(err as Error).message}`);
    }
  }

  private parseLineItems(raw: string): LineItem[] | undefined {
    try {
      return JSON.parse(raw);
    } catch {
      console.warn("Failed to parse line items, using empty array");
      return undefined;
    }
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
