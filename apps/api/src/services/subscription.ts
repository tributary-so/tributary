/**
 * Subscription Service
 * Handles subscription status checking using the PaymentTracker
 */

import { PaymentTracker, PolicyLookupOptions } from "@tributary-so/payments";
import { getConnection } from "./solana";
import { decodeMemo } from "@tributary-so/sdk";

/**
 * Get full subscription details by tracking ID
 * @param options - Lookup options (user or gateway public key)
 * @returns Match payment policies
 */
export async function getSubscriptionDetails(options: PolicyLookupOptions) {
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
