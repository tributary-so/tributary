// Main payments client - zero configuration required

import { CheckoutSessionManager } from "./session";
import { PaymentTracker } from "./tracking";
import { Tributary } from "@tributary-so/sdk";

export class PaymentsClient {
  private _checkout: CheckoutSessionManager;
  private _tracker: PaymentTracker;

  constructor(tributary: Tributary) {
    // Zero configuration initialization
    const connection = tributary.connection;
    this._checkout = new CheckoutSessionManager(connection, tributary);
    this._tracker = new PaymentTracker(connection, tributary);
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
      checkStatus: async (trackingId: string, recipient: string) => {
        return this._tracker.checkPaymentStatus(trackingId, recipient);
      },

      // Get payment history for tracking ID
      getHistory: async (trackingId: string, recipient: string) => {
        return this._tracker.getPaymentHistory(trackingId, recipient);
      },
    };
  }

  // Subscription management with dual lookup
  get subscriptions() {
    return {
      /**
       * Check subscription status using dual lookup strategy
       */
      checkStatus: async (
        options: { trackingId: string } & (
          | { userPublicKey: string; tokenMint?: string }
          | { gatewayPublicKey: string }
        )
      ) => {
        return this._tracker.checkInitialStatus(options.trackingId, options);
      },

      /**
       * Quick check if subscription is active
       */
      isActive: async (
        options: { trackingId: string } & (
          | { userPublicKey: string; tokenMint?: string }
          | { gatewayPublicKey: string }
        )
      ) => {
        return this._tracker.isSubscriptionActive(options.trackingId, options);
      },

      /**
       * Get detailed subscription information
       */
      getDetails: async (
        options: { trackingId: string } & (
          | { userPublicKey: string; tokenMint?: string }
          | { gatewayPublicKey: string }
        )
      ) => {
        return this._tracker.getSubscriptionDetails(
          options.trackingId,
          options
        );
      },
    };
  }
}
