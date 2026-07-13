// One-time payment tracking using SPL transfers with memo fields.
//
// Status: PARTIAL STUB. `checkStatus` returns a placeholder "pending"
// shape and `buildPaymentMemo` / `extractTrackingId` are identity helpers.
// Indexer-backed lookup was removed (P-1, review 2026-07-06): the previous
// `getFromIndexer` threw "not yet implemented" while being part of the
// public exported surface. Re-add when the indexer integration lands.

export class OneTimePaymentTracker {
  constructor() {}

  /**
   * Check one-time payment status by tracking ID.
   * Searches for SPL transfers with matching memo.
   * @param trackingId The tracking ID to search for
   * @returns Payment status with transaction details if found
   */
  async checkStatus(trackingId: string) {
    return {
      trackingId,
      status: "pending",
      amount: 0,
      recipient: "",
    };
  }

  buildPaymentMemo(trackingId: string): string {
    return trackingId;
  }

  extractTrackingId(memo: string): string | null {
    return memo || null;
  }
}
