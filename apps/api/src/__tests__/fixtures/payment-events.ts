import { TypedEvent } from "../../db/queries";
import { TributaryPaymentRecord } from "../../db/events";

export function createMockPaymentEvent(
  trackingId: string,
  overrides?: Partial<TypedEvent<TributaryPaymentRecord>>
): TypedEvent<TributaryPaymentRecord> {
  const trackingIdBytes = Array.from(trackingId).map((c) => c.charCodeAt(0));

  return {
    id: Buffer.from("mock-id-1"),
    signature: "5Kq3...mock_signature",
    slot: 123456789,
    timestamp: new Date("2024-01-01T00:00:00Z"),
    eventName: "tributary_PaymentRecord",
    data: {
      payment_policy: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      gateway: "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      amount: 1000000,
      timestamp: Date.now(),
      memo: trackingIdBytes,
      record_id: 1,
    },
    ...overrides,
  };
}

export const mockPaymentEvents = {
  singlePayment: createMockPaymentEvent("test_tracking_123"),

  multiplePayments: [
    createMockPaymentEvent("test_tracking_456", {
      id: Buffer.from("mock-id-1"),
      data: {
        ...createMockPaymentEvent("test_tracking_456").data,
        record_id: 1,
        amount: 1000000,
      },
    }),
    createMockPaymentEvent("test_tracking_456", {
      id: Buffer.from("mock-id-2"),
      data: {
        ...createMockPaymentEvent("test_tracking_456").data,
        record_id: 2,
        amount: 2000000,
      },
    }),
    createMockPaymentEvent("test_tracking_456", {
      id: Buffer.from("mock-id-3"),
      data: {
        ...createMockPaymentEvent("test_tracking_456").data,
        record_id: 3,
        amount: 3000000,
      },
    }),
  ],

  emptyResults: [],

  paymentsWithRecipient: createMockPaymentEvent("test_tracking_789", {
    data: {
      ...createMockPaymentEvent("test_tracking_789").data,
      amount: 5000000,
    },
  }),

  specialCharacters: createMockPaymentEvent("test_tracking_special-123_ABC"),

  unicodeTrackingId: createMockPaymentEvent("test_tracking_日本語"),

  longTrackingId: createMockPaymentEvent("a".repeat(64)),

  paginationTest: Array.from({ length: 25 }, (_, i) =>
    createMockPaymentEvent("test_tracking_page", {
      id: Buffer.from(`mock-id-${i + 1}`),
      data: {
        ...createMockPaymentEvent("test_tracking_page").data,
        record_id: i + 1,
        amount: (i + 1) * 100000,
      },
    })
  ),
};
