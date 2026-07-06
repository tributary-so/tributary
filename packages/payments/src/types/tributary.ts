// Tributary-compatible types for Tributary payments

/**
 * String vocabulary for the on-chain `PaymentFrequency` enum
 * (`programs/tributary/src/state/payment_policy.rs`). Mirrors the SDK's
 * `PaymentFrequencyString`. The encoder accepts the full enum; per-variant
 * validators (feature tributary-uny8) narrow it further.
 */
export type SubscriptionFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semiAnnually"
  | "annually"
  | "custom";

/**
 * Discriminator covering all 6 coexisting checkout modes (milestone Axis 2):
 * the 5 PaymentPolicy variants (subscription / milestone / payAsYouGo /
 * oneTime / upTo) plus the standalone direct SPL transfer (`payment`,
 * ADR-0004 — no policy). Composable policies are out of scope.
 */
export type TributaryConfigVariant =
  | "subscription"
  | "milestone"
  | "payAsYouGo"
  | "oneTime"
  | "upTo"
  | "payment";

export const TRIBUTARY_CONFIG_VARIANTS: readonly TributaryConfigVariant[] = [
  "subscription",
  "milestone",
  "payAsYouGo",
  "oneTime",
  "upTo",
  "payment",
];

export function isTributaryConfigVariant(
  value: unknown
): value is TributaryConfigVariant {
  return (
    typeof value === "string" &&
    (TRIBUTARY_CONFIG_VARIANTS as readonly string[]).includes(value)
  );
}

/** Fields shared by every policy variant (NOT the direct-transfer `payment`). */
interface PolicyConfigBase {
  /** base58 gateway authority (PaymentGateway PDA seeds derive from it). */
  gateway: string;
  /** base58 recipient token account owner. */
  recipient: string;
  /** Merchant correlation id; surfaced as the policy memo's tracking id. */
  trackingId: string;
  /** Optional memo (mirrors on-chain 64-byte memo). */
  memo?: string;
}

/**
 * Canonical merchant-side spec for a checkout session. One discriminated
 * union per variant (milestone Axis 4/5). Amounts/timestamps use
 * `number | string` so u64/i64 values survive JSON round-trips (base64
 * session encoding serializes through `JSON.stringify`).
 *
 * Mirrors the on-chain `PolicyType` shapes
 * (`programs/tributary/src/state/payment_policy.rs`); the standalone
 * `payment` variant mirrors the ADR-0004 direct transfer.
 */
export type TributaryConfig =
  | (PolicyConfigBase & {
      variant: "subscription";
      autoRenew?: boolean;
      /** Renewal cap; omit for indefinite. */
      maxRenewals?: number | null;
      paymentFrequency?: SubscriptionFrequency;
    })
  | (PolicyConfigBase & {
      variant: "milestone";
      /** 1-4 milestone amounts (u64). Trailing unused slots omitted. */
      milestoneAmounts: Array<number | string>;
      /** Absolute unix-second timestamps, ascending. */
      milestoneTimestamps: number[];
      /** Bitmap: bit0=due-date, bits1-3 mutually exclusive signer gates. */
      releaseCondition: number;
      /** 1-4. */
      totalMilestones: number;
    })
  | (PolicyConfigBase & {
      variant: "payAsYouGo";
      maxAmountPerPeriod: number | string;
      maxChunkAmount: number | string;
      periodLengthSeconds: number | string;
    })
  | (PolicyConfigBase & {
      variant: "oneTime";
      amount: number | string;
      /** <=0 (or omitted) = immediately executable. */
      dueDate?: number;
      /** Omitted = never expires. */
      expiryDate?: number;
    })
  | (PolicyConfigBase & {
      variant: "upTo";
      maxAmount: number | string;
      /** <=0 (or omitted) = immediate. */
      validAfter?: number;
      /** Mandatory, >0, > validAfter. */
      deadline: number;
    })
  | {
      variant: "payment";
      recipient: string;
      trackingId: string;
      amount: number | string;
      memo?: string;
    };

/**
 * Legacy pre-union config shape. The original `TributaryConfig` only
 * described subscriptions implicitly (amount/frequency came from
 * `line_items`). Retained for one release so existing callers keep working;
 * `resolveTributaryConfig` translates it into the `subscription` variant.
 *
 * @deprecated Use the discriminated {@link TributaryConfig} union instead.
 */
export interface LegacyTributaryConfig {
  gateway: string;
  recipient: string;
  trackingId: string;
  autoRenew?: boolean;
  memo?: string;
}

/**
 * Normalize a merchant-supplied config into the canonical discriminated
 * union. New-variant input passes through untouched. Legacy-shape input is
 * translated into the `subscription` variant (the only mode the legacy
 * interface could express) and a deprecation warning is emitted.
 *
 * Per-variant fail-fast validation lives in `ValidationUtils` (feature
 * tributary-uny8); this shim only selects the union arm.
 */
export function resolveTributaryConfig(
  input: TributaryConfig | LegacyTributaryConfig
): TributaryConfig {
  if (input && typeof input === "object") {
    const v = (input as { variant?: unknown }).variant;
    if (isTributaryConfigVariant(v)) {
      return input as TributaryConfig;
    }
  }

  // Legacy shape — translate to subscription variant.
  const legacy = input as LegacyTributaryConfig;
  if (
    !legacy ||
    typeof legacy.gateway !== "string" ||
    typeof legacy.recipient !== "string" ||
    typeof legacy.trackingId !== "string"
  ) {
    throw new Error(
      "Invalid TributaryConfig: missing `variant` discriminator and not a legacy {gateway,recipient,trackingId} shape."
    );
  }

  // ponytail: per-call warn — session create is a cold path (one checkout),
  // so a once-per-process guard would add state for no log-spam benefit.
  console.warn(
    "[tributary-payments] TributaryConfig without a `variant` is deprecated; " +
      'defaulting to variant="subscription". Add `variant: "subscription"` ' +
      "(or the relevant policy variant) to silence this warning."
  );

  return {
    variant: "subscription",
    gateway: legacy.gateway,
    recipient: legacy.recipient,
    trackingId: legacy.trackingId,
    autoRenew: legacy.autoRenew,
    memo: legacy.memo,
  };
}

export interface OneTimePaymentParams {
  tokenMint: string;
  recipient: string;
  amount: number;
  trackingId?: string;
  memo?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface OneTimePaymentStatus {
  trackingId: string;
  status: "pending" | "paid" | "expired";
  transaction?: PaymentTransaction;
  amount: number;
  recipient: string;
  paidAt?: number;
}

export interface TributaryCheckoutSession {
  id: string;
  object: "checkout.session";
  url?: string;
  payment_method_types: string[];
  line_items: LineItem[];
  /**
   * Checkout mode. `payment` = direct SPL `transfer` (ADR-0004 — moves tokens
   * immediately, creates NO policy). `subscription` = recurring PaymentPolicy.
   * Distinct from the OneTime PolicyType (ADR-0019) which installs a
   * single-shot policy; that variant lives under the `policy` checkout path,
   * not this enum.
   */
  mode: "payment" | "subscription";
  success_url?: string;
  cancel_url?: string;
  customer?: string;
  payment_status: "unpaid" | "paid";
  status: "open" | "complete" | "expired";
  amount_total?: number;
  currency?: string;
  metadata?: Record<string, string>;
  // Accepts either the new discriminated union or the legacy interface during
  // the soft-deprecation window (feature tributary-zre4).
  tributaryConfig?: TributaryConfig | LegacyTributaryConfig;
}

export interface LineItem {
  description: string;
  unitPrice: number;
  quantity: number;
}

export interface TributarySubscription {
  id: string;
  object: "subscription";
  customer: string;
  status:
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "paused";
  current_period_start: number;
  current_period_end: number;
  items: SubscriptionItem[];
  metadata?: Record<string, string>;
}

export interface SubscriptionItem {
  id: string;
  object: "subscription_item";
  price: Price;
  quantity: number;
}

export interface Price {
  id: string;
  object: "price";
  currency: string;
  unit_amount: number;
  recurring?: {
    interval: "day" | "week" | "month" | "year";
    interval_count: number;
  };
}

export interface PaymentStatus {
  status: "pending" | "paid" | "failed";
  transactions: PaymentTransaction[];
}

export interface PaymentTransaction {
  signature: string;
  timestamp: number;
  amount: number;
  recipient: string;
  memo: string;
  trackingId?: string;
}
