/**
 * Subscription Service
 * Handles subscription status checking using the PaymentTracker
 */

import { Tributary } from "@tributary-so/sdk";
import {
  PaymentTracker,
  SubscriptionStatus,
  PolicyLookupOptions,
} from "@tributary-so/payments";
import { getConnection } from "./solana";

/**
 * Create a PaymentTracker instance
 * @param tributary - Tributary SDK instance
 * @returns PaymentTracker instance
 */
export function createPaymentTracker(tributary: Tributary): PaymentTracker {
  const connection = getConnection();
  return new PaymentTracker(connection, tributary);
}

/**
 * Check subscription status by tracking ID with provided Tributary instance
 * @param trackingId - The tracking ID from the payment memo
 * @param tributary - Tributary SDK instance
 * @param options - Lookup options (user or gateway public key)
 * @returns Subscription status
 */
export async function checkSubscriptionStatusWithTributary(
  trackingId: string,
  tributary: Tributary,
  options: PolicyLookupOptions
): Promise<SubscriptionStatus> {
  const connection = getConnection();
  const tracker = new PaymentTracker(connection, tributary);
  return await tracker.checkInitialStatus(trackingId, options);
}

/**
 * Get full subscription details by tracking ID
 * @param trackingId - The tracking ID from the payment memo
 * @param tributary - Tributary SDK instance
 * @param options - Lookup options (user or gateway public key)
 * @returns Subscription details with policy and session data
 */
export async function getSubscriptionDetails(
  trackingId: string,
  tributary: Tributary,
  options: PolicyLookupOptions
) {
  const connection = getConnection();
  const tracker = new PaymentTracker(connection, tributary);
  return await tracker.getSubscriptionByTrackingId(trackingId, options);
}
