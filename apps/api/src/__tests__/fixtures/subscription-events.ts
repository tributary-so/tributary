export interface MockPaymentPolicy {
  publicKey: string;
  account: {
    owner: string;
    recipient: string;
    gateway: string;
    userPayment: string;
    policyId: number;
    policyType: {
      subscription?: {
        amount: number;
        autoRenew: boolean;
        maxRenewals: number | null;
        paymentFrequency:
          | { Monthly: null }
          | { Weekly: null }
          | { Daily: null };
        nextPaymentDue: number;
        padding: number[];
      };
      payAsYouGo?: {
        maxAmountPerPeriod: number;
        maxChunkAmount: number;
        periodLengthSeconds: number;
        currentPeriodStart: number;
        currentPeriodTotal: number;
        padding: number[];
      };
      milestone?: {
        milestoneAmounts: [number, number, number, number];
        milestoneTimestamps: [number, number, number, number];
        currentMilestone: number;
        releaseCondition: number;
        totalMilestones: number;
        escrowAmount: number;
        padding: number[];
      };
    };
    memo: number[];
    totalPaid: { toNumber: () => number };
    createdAt: { toNumber: () => number };
    updatedAt: { toNumber: () => number };
    bump: number;
    padding: number[];
  };
}

export function createMockPaymentPolicy(
  trackingId: string,
  overrides?: Partial<MockPaymentPolicy["account"]>
): MockPaymentPolicy {
  const trackingIdBytes = Array.from(trackingId).map((c) => c.charCodeAt(0));

  return {
    publicKey: "5WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    account: {
      owner: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      recipient: "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      gateway: "7WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      userPayment: "6WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      policyId: 1,
      policyType: {
        subscription: {
          amount: 1000000,
          autoRenew: true,
          maxRenewals: null,
          paymentFrequency: { Monthly: null },
          nextPaymentDue: Date.now() / 1000 + 86400 * 30,
          padding: [],
        },
      },
      memo: trackingIdBytes,
      totalPaid: { toNumber: () => 1000000 },
      createdAt: { toNumber: () => 1704067200 },
      updatedAt: { toNumber: () => 1704067200 },
      bump: 255,
      padding: [],
      ...overrides,
    },
  };
}

export const mockSubscriptionPolicies = {
  singlePolicy: createMockPaymentPolicy("test_tracking_123"),

  multiplePolicies: [
    createMockPaymentPolicy("test_tracking_456", {
      policyId: 1,
      recipient: "recipient1",
    }),
    createMockPaymentPolicy("test_tracking_456", {
      policyId: 2,
      recipient: "recipient2",
    }),
    createMockPaymentPolicy("test_tracking_456", {
      policyId: 3,
      recipient: "recipient3",
    }),
  ],

  emptyResults: [],

  payAsYouGoPolicy: createMockPaymentPolicy("test_tracking_payg", {
    policyType: {
      payAsYouGo: {
        maxAmountPerPeriod: 10000000,
        maxChunkAmount: 1000000,
        periodLengthSeconds: 86400 * 7,
        currentPeriodStart: Date.now() / 1000,
        currentPeriodTotal: 500000,
        padding: [],
      },
    },
  }),

  milestonePolicy: createMockPaymentPolicy("test_tracking_milestone", {
    policyType: {
      milestone: {
        milestoneAmounts: [250000, 250000, 250000, 250000],
        milestoneTimestamps: [
          Date.now() / 1000,
          Date.now() / 1000 + 86400 * 30,
          Date.now() / 1000 + 86400 * 60,
          Date.now() / 1000 + 86400 * 90,
        ],
        currentMilestone: 0,
        releaseCondition: 1000000,
        totalMilestones: 4,
        escrowAmount: 1000000,
        padding: [],
      },
    },
  }),

  differentGateways: [
    createMockPaymentPolicy("test_tracking_gateway1", {
      gateway: "gateway1_pubkey",
    }),
    createMockPaymentPolicy("test_tracking_gateway2", {
      gateway: "gateway2_pubkey",
    }),
  ],

  differentUsers: [
    createMockPaymentPolicy("test_tracking_user1", {
      owner: "user1_pubkey",
    }),
    createMockPaymentPolicy("test_tracking_user2", {
      owner: "user2_pubkey",
    }),
  ],
};
