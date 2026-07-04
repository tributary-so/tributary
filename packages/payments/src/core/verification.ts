import { jwtVerify, createRemoteJWKSet } from "jose";

const DEFAULT_BASE_URL = "https://api.tributary.so";
const DEFAULT_ISSUER = "https://api.tributary.so";
const DEFAULT_AUDIENCE = "tributary-checkout";

export interface TributaryVerificationConfig {
  baseUrl?: string;
  issuer?: string;
  audience?: string;
}

export interface VerifyPaymentOptions {
  recipient: string;
  wallet: string;
  memo: string;
}

export interface VerifyPolicyOptions {
  recipient: string;
  wallet: string;
  /** Optional discriminator filter. Omit to match any variant. */
  variant?: PolicyVariant;
  /** Optional status filter (string or list). Omit to accept any status. */
  status?: string | string[];
}

/**
 * @deprecated Kept as a thin alias over {@link VerifyPolicyOptions} for one
 * release. Use `verifyPolicy` with `variant: "subscription"` instead.
 */
export interface VerifySubscriptionOptions {
  recipient: string;
  wallet: string;
  memo: string;
}

/** The 5 PaymentPolicy variants mirrored from the on-chain PolicyType enum. */
export type PolicyVariant =
  | "subscription"
  | "milestone"
  | "payAsYouGo"
  | "oneTime"
  | "upTo";

interface PolicyClaimBase {
  variant: PolicyVariant;
  policyAddress: string;
  policyId: number;
  recipient: string;
  gateway: string;
  memo: string;
  createdAt: number;
}

export interface SubscriptionPolicyClaim extends PolicyClaimBase {
  variant: "subscription";
  amount: string;
  paymentFrequency: string;
  totalPayments: number;
  nextPaymentDue: number | null;
  status: "paid" | "overdue" | "completed";
  autoRenew: boolean;
  maxRenewals: number | null;
}

export interface MilestonePolicyClaim extends PolicyClaimBase {
  variant: "milestone";
  milestoneAmounts: string[];
  milestoneTimestamps: number[];
  currentMilestone: number;
  totalMilestones: number;
  escrowAmount: string;
  escrowRemaining: string;
  releaseCondition: number;
  status: "active" | "completed";
}

export interface PayAsYouGoPolicyClaim extends PolicyClaimBase {
  variant: "payAsYouGo";
  maxAmountPerPeriod: string;
  maxChunkAmount: string;
  periodLengthSeconds: number;
  currentPeriodStart: number;
  currentPeriodTotal: string;
  capRemainingThisPeriod: string;
  periodResetsAt: number;
  status: "active" | "exhausted";
}

export interface OneTimePolicyClaim extends PolicyClaimBase {
  variant: "oneTime";
  amount: string;
  dueDate: number | null;
  expiryDate: number | null;
  status: "pending" | "completed" | "expired";
}

export interface UpToPolicyClaim extends PolicyClaimBase {
  variant: "upTo";
  maxAmount: string;
  validAfter: number | null;
  deadline: number;
  status: "pending" | "settled" | "expired";
}

/**
 * Discriminated union of per-variant policy claims carried by a Tributary JWT.
 * The `variant` field is the discriminator. Inspect variant-specific fields
 * after narrowing, or read `status` for the per-variant state vocabulary.
 *
 * Design: the JWT is an attestation of policy state (authorization proof) AND
 * a carrier for recent PaymentRecords (payment proof). Consumers decide which
 * aspect to require — an empty `lastPayments[]` with a non-empty `policies[]`
 * means "authorized, not yet executed".
 */
export type PolicyClaim =
  | SubscriptionPolicyClaim
  | MilestonePolicyClaim
  | PayAsYouGoPolicyClaim
  | OneTimePolicyClaim
  | UpToPolicyClaim;

export interface PaymentRecord {
  signature: string;
  slot: number;
  // part of the event
  policyAddress: string;
  gateway: string;
  amount: string;
  timestamp: number;
  memo: string;
  recordId: number;
  payer: string;
  recipient: string;
  tokenMint: string;
}

export interface TributaryJWTPayload {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
  nbf: number;
  policies: PolicyClaim[];
  lastPayments: PaymentRecord[];
}

export class VerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerificationError";
  }
}

export class PaymentVerificationError extends VerificationError {
  constructor(message: string) {
    super(message);
    this.name = "PaymentVerificationError";
  }
}

export class PolicyVerificationError extends VerificationError {
  constructor(message: string) {
    super(message);
    this.name = "PolicyVerificationError";
  }
}

/**
 * @deprecated Kept for one release. {@link PolicyVerificationError} replaces it.
 */
export class SubscriptionVerificationError extends PolicyVerificationError {
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionVerificationError";
  }
}

export class TributaryVerifier {
  private baseUrl: string;
  private issuer: string;
  private audience: string;
  private jwksUrl: URL;
  private jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(config?: TributaryVerificationConfig) {
    this.baseUrl =
      config?.baseUrl ?? process.env.TRIBUTARY_BASE_URL ?? DEFAULT_BASE_URL;
    this.issuer =
      config?.issuer ?? process.env.TRIBUTARY_ISSUER ?? DEFAULT_ISSUER;
    this.audience =
      config?.audience ?? process.env.TRIBUTARY_AUDIENCE ?? DEFAULT_AUDIENCE;
    this.jwksUrl = new URL(`${this.baseUrl}/.well-known/jwks.json`);
    this.jwks = createRemoteJWKSet(this.jwksUrl);
  }

  async verify(token: string): Promise<TributaryJWTPayload> {
    const { payload } = await jwtVerify(token, this.jwks, {
      algorithms: ["ES256"],
      issuer: this.issuer,
      audience: this.audience,
      clockTolerance: "30s",
    });
    return payload as unknown as TributaryJWTPayload;
  }

  async verifyPayment(
    token: string,
    options: VerifyPaymentOptions
  ): Promise<PaymentRecord> {
    const payload = await this.verify(token);

    if (payload.sub !== options.wallet) {
      throw new PaymentVerificationError(
        `Wallet mismatch: token issued for ${payload.sub}, expected ${options.wallet}`
      );
    }

    const payments = payload.lastPayments || [];
    const match = payments.find(
      (p) =>
        p.recipient === options.recipient &&
        p.payer === options.wallet &&
        p.memo.trim() === options.memo.trim()
    );

    if (!match) {
      throw new PaymentVerificationError(
        `No payment found matching recipient=${options.recipient}, wallet=${options.wallet}, memo=${options.memo}`
      );
    }

    return match;
  }

  /**
   * Verify the token carries a policy claim attesting authorization for the
   * given recipient. Returns the matching {@link PolicyClaim}. The merchant
   * decides whether to also require a matching PaymentRecord (call
   * {@link verifyPayment} separately) — an installed-but-unexecuted policy
   * (PayAsYouGo/UpTo just created) yields a valid claim with no payment.
   *
   * @param options.variant  optional discriminator filter
   * @param options.status   optional status filter (string or list)
   */
  async verifyPolicy(
    token: string,
    options: VerifyPolicyOptions
  ): Promise<PolicyClaim> {
    const payload = await this.verify(token);

    if (payload.sub !== options.wallet) {
      throw new PolicyVerificationError(
        `Wallet mismatch: token issued for ${payload.sub}, expected ${options.wallet}`
      );
    }

    const policies = payload.policies || [];
    const statusFilter =
      options.status === undefined
        ? null
        : Array.isArray(options.status)
        ? options.status
        : [options.status];

    const candidates = policies.filter((p) => {
      if (p.recipient !== options.recipient) return false;
      if (options.variant && p.variant !== options.variant) return false;
      if (statusFilter && !statusFilter.includes(p.status)) return false;
      return true;
    });

    if (candidates.length === 0) {
      throw new PolicyVerificationError(
        buildNotFoundMessage(options, policies)
      );
    }

    // ponytail: first match wins. Callers wanting a specific status/variant narrow via options.
    return candidates[0];
  }

  /**
   * @deprecated Kept as a thin alias over {@link verifyPolicy} for one release.
   * Preserves the legacy behavior: requires `variant: "subscription"` with
   * `status: "paid"`, AND a matching PaymentRecord memo (payment proof).
   *
   * New consumers should call `verifyPolicy` (authorization) and optionally
   * `verifyPayment` (payment proof) separately.
   */
  async verifySubscription(
    token: string,
    options: VerifySubscriptionOptions
  ): Promise<SubscriptionPolicyClaim> {
    const payload = await this.verify(token);

    if (payload.sub !== options.wallet) {
      throw new SubscriptionVerificationError(
        `Wallet mismatch: token issued for ${payload.sub}, expected ${options.wallet}`
      );
    }

    const policies = payload.policies || [];
    const subscriptions = policies.filter(
      (p): p is SubscriptionPolicyClaim =>
        p.variant === "subscription" && p.recipient === options.recipient
    );

    const match = subscriptions.find((s) => s.status === "paid");

    if (!match) {
      if (subscriptions.length > 0) {
        const statuses = subscriptions.map((s) => s.status).join(", ");
        throw new SubscriptionVerificationError(
          `Subscription found but not paid (status: ${statuses})`
        );
      }
      throw new SubscriptionVerificationError(
        `No active subscription found for recipient=${options.recipient}, wallet=${options.wallet}`
      );
    }

    const payments = payload.lastPayments || [];
    const paymentMatch = payments.find(
      (p) =>
        p.recipient === options.recipient &&
        p.payer === options.wallet &&
        p.memo.trim() === options.memo.trim()
    );

    if (!paymentMatch && options.memo) {
      throw new SubscriptionVerificationError(
        `Subscription is paid but no payment found with memo="${options.memo}"`
      );
    }

    return match;
  }
}

function buildNotFoundMessage(
  options: VerifyPolicyOptions,
  policies: PolicyClaim[]
): string {
  const variantPart = options.variant ? ` variant=${options.variant}` : "";
  const statusPart = options.status
    ? ` status=${
        Array.isArray(options.status)
          ? options.status.join("|")
          : options.status
      }`
    : "";
  const present = policies.length;
  return `No policy claim found matching recipient=${options.recipient}${variantPart}${statusPart} (policies in token: ${present})`;
}
