/**
 * Subscription Service
 * Handles subscription status checking using the PaymentTracker
 */

import { PublicKey } from "@solana/web3.js";
import { PaymentTracker, PolicyLookupOptions } from "@tributary-so/payments";
import { getConnection } from "./solana";
import { decodeMemo, PaymentPolicy } from "@tributary-so/sdk";

/**
 * Padding-stripped policy variant payload.
 *
 * Typed via an index signature (`[field: string]: unknown`) on purpose: the
 * runtime still carries nested `BN` numeric fields (e.g. `amount`,
 * `nextPaymentDue`), and naming `BN` here would force a non-portable
 * reference to `@types/bn.js` (which `@tributary-so/api` does not depend on
 * directly) in the emitted `.d.ts`. Field-level precision lives in the SDK's
 * `PolicyType`; callers that touch those fields already tolerate `BN`
 * (see `buildSubscriptionClaims`).
 */
type StrippedPolicyVariant = { padding?: undefined; [field: string]: unknown };

/**
 * A {@link PaymentPolicy} normalized for JSON serialization:
 * - `memo` u8[64] vector → decoded string
 * - top-level BN timestamp/total fields → JS numbers
 * - `padding` / `bump` redacted to `undefined`
 * - `policyAccount` carries the original policy PDA
 * - `policyType` has its per-variant `padding` stripped (loose-typed so the
 *   `.d.ts` stays portable; see {@link StrippedPolicyVariant})
 */
export type SubscriptionDetails = Omit<
  PaymentPolicy,
  | "padding"
  | "bump"
  | "memo"
  | "totalPaid"
  | "createdAt"
  | "updatedAt"
  | "policyType"
> & {
  padding: undefined;
  bump: undefined;
  memo: string;
  totalPaid: number;
  createdAt: number;
  updatedAt: number;
  policyType:
    | { subscription: StrippedPolicyVariant }
    | { payAsYouGo: StrippedPolicyVariant }
    | { milestone: StrippedPolicyVariant }
    | undefined;
  policyAccount: PublicKey;
};

/**
 * Get full subscription details by tracking ID
 * @param options - Lookup options (user or gateway public key)
 * @returns Matched payment policies with BN/padding artifacts normalized away
 */
export async function getSubscriptionDetails(
  options: PolicyLookupOptions
): Promise<SubscriptionDetails[]> {
  const connection = getConnection();
  const tracker = new PaymentTracker(connection);
  const policies = await tracker.getPaymentPoliciesForOptions(options);

  // remove the paddings
  return policies.map(({ account: account, publicKey }) => {
    let policyType;
    if ("subscription" in account.policyType) {
      policyType = {
        subscription: {
          ...account.policyType.subscription,
          padding: undefined,
        },
      };
    }
    if ("payAsYouGo" in account.policyType) {
      policyType = {
        payAsYouGo: {
          ...account.policyType.payAsYouGo,
          padding: undefined,
        },
      };
    }
    if ("milestone" in account.policyType) {
      policyType = {
        milestone: {
          ...account.policyType.milestone,
          padding: undefined,
        },
      };
    }
    return {
      ...account,
      memo: decodeMemo(account.memo),
      padding: undefined,
      bump: undefined,
      totalPaid: account.totalPaid.toNumber(),
      createdAt: account.createdAt.toNumber(),
      updatedAt: account.updatedAt.toNumber(),
      policyType,
      policyAccount: publicKey,
    };
  });
}
