// Main payments client - zero configuration required

import { StripeCheckoutSession, TributaryConfig } from "../types/stripe";
import { CheckoutSessionManager } from "./session";
import { PaymentTracker } from "./tracking";

export class PaymentsClient {
  private _checkout: CheckoutSessionManager;
  private _tracker: PaymentTracker;

  constructor() {
    // Zero configuration initialization
    this._checkout = new CheckoutSessionManager();
    this._tracker = new PaymentTracker();
  }

  // Stripe-compatible checkout sessions
  get checkout() {
    return this._checkout;
  }

  // Payment tracking utilities
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
}
