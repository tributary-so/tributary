// Main payments client - zero configuration required

import { CheckoutSessionManager } from "./session";
import { PaymentTracker } from "./tracking";
import { Connection } from "@solana/web3.js";
import { Tributary } from "@tributary-so/sdk";

export class PaymentsClient {
  private _checkout: CheckoutSessionManager;
  private _tracker: PaymentTracker;

  constructor(connection: Connection, tributary: Tributary) {
    // Zero configuration initialization
    this._checkout = new CheckoutSessionManager();
    this._tracker = new PaymentTracker(connection, tributary);
  }

  // Tributary-compatible checkout sessions
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
