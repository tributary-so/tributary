import { getOneTimePaymentByTrackingId } from "../db/queries";
import { bytesToString } from "../db/events";
import { OneTimePaymentDetails } from "../types";


export async function getOneTimePaymentDetails(
  trackingId: string,
  options?: {
    recipient?: string;
    limit?: number;
    offset?: number;
  }
): Promise<OneTimePaymentDetails[]> {
  const events = await getOneTimePaymentByTrackingId(trackingId, options);

  return events.map((event) => ({
    trackingId,
    signature: event.signature,
    slot: event.slot,
    timestamp: event.timestamp,
    paymentPolicy: event.data.payment_policy,
    gateway: event.data.gateway,
    amount: event.data.amount,
    memo: bytesToString(event.data.memo),
    recordId: event.data.record_id,
  }));
}
