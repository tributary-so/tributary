// Main payments client - zero configuration required

import { CheckoutSessionManager } from "./session";
import { OneTimePaymentTracker } from "./onetime";
import { Tributary } from "@tributary-so/sdk";

export class PaymentsClient {
  private _checkout: CheckoutSessionManager;
  private _onetimeTracker: OneTimePaymentTracker;

  constructor(tributary: Tributary) {
    // Zero configuration initialization
    const connection = tributary.connection;
    this._checkout = new CheckoutSessionManager(connection, tributary);
    this._onetimeTracker = new OneTimePaymentTracker();
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

  // Subscription management with dual lookup
  get subscriptions() {
    return {
      /**
       * Check subscription status using dual lookup strategy
       */
      checkStatus: async (
        _options: { trackingId: string } & (
          | { userPublicKey: string; tokenMint?: string }
          | { gatewayPublicKey: string }
        )
      ) => {
        // FIXME: TODO
        // return this._tracker.checkInitialStatus(options.trackingId, options);
      },

      /**
       * Quick check if subscription is active
       */
      isActive: async (
        _options: { trackingId: string } & (
          | { userPublicKey: string; tokenMint?: string }
          | { gatewayPublicKey: string }
        )
      ) => {
        // FIXME: TODO
        // return this._tracker.isSubscriptionActive(options.trackingId, options);
      },

      /**
       * Get detailed subscription information
       */
      getDetails: async (
        _options: { trackingId: string } & (
          | { userPublicKey: string; tokenMint?: string }
          | { gatewayPublicKey: string }
        )
      ) => {
        // FIXME: TODO
        // return this._tracker.getSubscriptionDetails(
        //   options.trackingId,
        //   options
        // );
      },
    };
  }
}
