// Main payments client - zero configuration required

import { CheckoutSessionManager } from "./session";
import { OneTimePaymentTracker } from "./onetime";
import { PaymentTracker, PolicyLookupOptions } from "./tracking";
import type { TributaryConfigVariant } from "../types/tributary";

/** Options for the policy query methods. Extends lookup options with an
 *  optional variant filter (Applied client-side on the on-chain policyType). */
export interface PolicyQueryOptions extends PolicyLookupOptions {
  /** Restrict results to a policy variant. Omit = all variants.
   *  `payment` (the direct transfer) matches nothing — payments aren't policies. */
  variant?: TributaryConfigVariant;
}

/** Summary returned by {@link PaymentsClient.policies.checkStatus}. */
export interface PolicyStatusSummary {
  total: number;
  active: number;
  policies: Array<{
    publicKey: string;
    status: string;
    paymentCount: number;
  }>;
}

/** On-chain PolicyStatus serializes as { active: {} } | { paused: {} } | { completed: {} }. */
function policyStatusOf(status: any): string {
  if (!status || typeof status !== "object") return "unknown";
  if ("active" in status) return "active";
  if ("paused" in status) return "paused";
  if ("completed" in status) return "completed";
  return "unknown";
}

/** policyType serializes as { <variant>: {...} }. Returns true if the given
 *  variant key is present on the policyType object. */
function matchesVariant(
  policyType: any,
  variant?: TributaryConfigVariant
): boolean {
  if (!variant) return true;
  return Boolean(
    policyType && typeof policyType === "object" && variant in policyType
  );
}

export class PaymentsClient {
  private _checkout: CheckoutSessionManager;
  private _onetimeTracker: OneTimePaymentTracker;
  private _tracker: PaymentTracker | null;

  /**
   * @param tracker Optional {@link PaymentTracker} backing the
   *   {@link policies} query methods. Without one, `.policies.*` throw a
   *   clear error; checkout / one-time tracking still work. (Dependency
   *   injection keeps the client unit-testable without a live Connection.)
   */
  constructor(tracker?: PaymentTracker) {
    // Zero configuration initialization
    this._checkout = new CheckoutSessionManager();
    this._onetimeTracker = new OneTimePaymentTracker();
    this._tracker = tracker ?? null;
  }

  // Tributary-compatible checkout sessions
  get checkout() {
    return {
      sessions: this._checkout,
    };
  }

  // Payment tracking utilities (legacy)
  get payments() {
    return {
      // Check payment status by tracking ID
      checkStatus: async (_trackingId: string, _recipient: string) => {
        // FIXME: TODO
        // return this._tracker.checkPaymentStatus(trackingId, recipient);
      },

      // Get payment history for tracking ID
      getHistory: async (_trackingId: string, _recipient: string) => {
        // FIXME: TODO
        // return this._tracker.getPaymentHistory(trackingId, recipient);
      },

      // One-time payment tracking
      oneTime: {
        checkStatus: async (trackingId: string) => {
          return this._onetimeTracker.checkStatus(trackingId);
        },

        buildMemo: (trackingId: string) => {
          return this._onetimeTracker.buildPaymentMemo(trackingId);
        },

        extractTrackingId: (memo: string) => {
          return this._onetimeTracker.extractTrackingId(memo);
        },
      },
    };
  }

  /**
   * Policy management namespace (renamed from `.subscriptions`, Axis 7).
   * Works for every PaymentPolicy variant — the underlying
   * {@link PaymentTracker.getPaymentPoliciesForOptions} returns all matching
   * policies regardless of variant; pass `options.variant` to narrow.
   */
  get policies() {
    const query = async (options: PolicyQueryOptions) => {
      const all = await this._requireTracker().getPaymentPoliciesForOptions(
        options
      );
      return options.variant
        ? all.filter((p) =>
            matchesVariant(p.account?.policyType, options.variant)
          )
        : all;
    };

    return {
      checkStatus: async (
        options: PolicyQueryOptions
      ): Promise<PolicyStatusSummary> => {
        const policies = await query(options);
        const summarized = policies.map((p) => ({
          publicKey: String(p.publicKey),
          status: policyStatusOf((p as any).account?.status),
          paymentCount: Number((p as any).account?.paymentCount ?? 0),
        }));
        return {
          total: summarized.length,
          active: summarized.filter((s) => s.status === "active").length,
          policies: summarized,
        };
      },

      isActive: async (options: PolicyQueryOptions): Promise<boolean> => {
        const policies = await query(options);
        return policies.some(
          (p) => policyStatusOf((p as any).account?.status) === "active"
        );
      },

      getDetails: async (options: PolicyQueryOptions) => {
        return query(options);
      },
    };
  }

  /** @deprecated Use {@link policies} instead. Removed next release. */
  get subscriptions() {
    console.warn(
      "[Tributary] PaymentsClient.subscriptions is deprecated; use .policies"
    );
    return this.policies;
  }

  private _requireTracker(): PaymentTracker {
    if (!this._tracker) {
      throw new Error(
        "PaymentsClient has no PaymentTracker; pass one to the constructor to use .policies queries."
      );
    }
    return this._tracker;
  }
}
