// @ts-nocheck
import { describe, it, expect } from "@jest/globals";

// Ponytail: mock the ESM-only `jose` and the workspace ESM packages so the
// pure helper functions (buildPolicyClaims, computePolicyExpiration) can be
// exercised without dragging the full JWT signer / SDK / payments CJS resolver.
jest.mock("jose", () => ({ SignJWT: class {} }));
jest.mock("@tributary-so/sdk", () => ({
  encodeMemo: (s: string) => Array.from(s, (c) => c.charCodeAt(0)),
  decodeMemo: (arr: number[]) => String.fromCharCode(...arr),
}));
jest.mock("@tributary-so/payments", () => ({}));
jest.mock("../services/jwks", () => ({
  getCurrentSigningKey: jest.fn(),
  getSigningKeyByKid: jest.fn(),
  importPrivateKey: jest.fn(),
}));
jest.mock("../services/subscription", () => ({
  getSubscriptionDetails: jest.fn(),
}));
jest.mock("../services/tx-verifier", () => ({
  verifyTransactionPayment: jest.fn(),
}));
jest.mock("../db", () => ({ getDb: jest.fn(() => ({})) }));

import {
  buildPolicyClaims,
  computePolicyExpiration,
} from "../services/token-issuer";

// Fake BN-like shape that mirrors what SubscriptionDetail exposes after
// getSubscriptionDetails() strips padding. Numbers and {toNumber,toString}
// objects both appear in real Anchor decoders; the helpers must handle both.
function bn(n: number) {
  return { toNumber: () => n, toString: () => String(n) };
}

const basePolicy = {
  policyAccount: { toString: () => "Pol1" },
  recipient: { toString: () => "Rec1" },
  gateway: { toString: () => "Gw1" },
  policyId: 1,
  memo: "memo",
  createdAt: 1_700_000_000,
  totalPaid: 0,
  status: { active: {} }, // PolicyStatus::Active shape
};

function policyWith(policyType: any, extra: any = {}) {
  return { ...basePolicy, ...extra, policyType };
}

describe("buildPolicyClaims — variant coverage", () => {
  it("subscription: paid/overdue/completed status transitions", () => {
    const future = Math.floor(Date.now() / 1000) + 86400;
    const past = Math.floor(Date.now() / 1000) - 86400;

    const paid = buildPolicyClaims([
      policyWith({
        subscription: {
          amount: bn(1_000_000),
          autoRenew: true,
          maxRenewals: null,
          paymentFrequency: { Monthly: {} },
          nextPaymentDue: future,
        },
      }),
    ])[0];
    expect(paid.variant).toBe("subscription");
    expect(paid.status).toBe("paid");
    expect(paid.amount).toBe("1000000");
    expect(paid.paymentFrequency).toBe("monthly");
    expect(paid.maxRenewals).toBeNull();

    const overdue = buildPolicyClaims([
      policyWith({
        subscription: {
          amount: bn(1_000_000),
          autoRenew: true,
          maxRenewals: null,
          paymentFrequency: { Monthly: {} },
          nextPaymentDue: past,
        },
      }),
    ])[0];
    expect(overdue.status).toBe("overdue");

    const completed = buildPolicyClaims([
      policyWith(
        {
          subscription: {
            amount: bn(1_000_000),
            autoRenew: false,
            maxRenewals: bn(3),
            paymentFrequency: { Monthly: {} },
            nextPaymentDue: future,
          },
        },
        { totalPaid: 3 }
      ),
    ])[0];
    expect(completed.status).toBe("completed");
    expect(completed.maxRenewals).toBe(3);
    expect(completed.totalPayments).toBe(3);
  });

  it("milestone: derives current/total + escrowRemaining + status", () => {
    const ts1 = Math.floor(Date.now() / 1000) + 100;
    const ts2 = Math.floor(Date.now() / 1000) + 200;
    const claim = buildPolicyClaims([
      policyWith({
        milestone: {
          milestoneAmounts: [bn(100), bn(200), bn(0), bn(0)],
          milestoneTimestamps: [bn(ts1), bn(ts2), bn(0), bn(0)],
          currentMilestone: 1,
          totalMilestones: 2,
          releaseCondition: 0b0010,
          escrowAmount: bn(300),
        },
      }),
    ])[0];
    expect(claim.variant).toBe("milestone");
    expect(claim.currentMilestone).toBe(1);
    expect(claim.totalMilestones).toBe(2);
    expect(claim.milestoneAmounts).toEqual(["100", "200"]);
    expect(claim.milestoneTimestamps).toEqual([ts1, ts2]);
    expect(claim.escrowAmount).toBe("300");
    expect(claim.escrowRemaining).toBe("300");
    expect(claim.status).toBe("active");

    const done = buildPolicyClaims([
      policyWith(
        {
          milestone: {
            milestoneAmounts: [bn(100), bn(200), bn(0), bn(0)],
            milestoneTimestamps: [bn(ts1), bn(ts2), bn(0), bn(0)],
            currentMilestone: 2,
            totalMilestones: 2,
            releaseCondition: 0,
            escrowAmount: bn(300),
          },
        },
        { totalPaid: 300 }
      ),
    ])[0];
    expect(done.status).toBe("completed");
    expect(done.escrowRemaining).toBe("0");
  });

  it("payAsYouGo: derives capRemainingThisPeriod, periodResetsAt, status", () => {
    const periodStart = Math.floor(Date.now() / 1000) - 1000;
    const claim = buildPolicyClaims([
      policyWith({
        payAsYouGo: {
          maxAmountPerPeriod: bn(1_000_000),
          maxChunkAmount: bn(100_000),
          periodLengthSeconds: bn(3600),
          currentPeriodStart: bn(periodStart),
          currentPeriodTotal: bn(400_000),
        },
      }),
    ])[0];
    expect(claim.variant).toBe("payAsYouGo");
    expect(claim.capRemainingThisPeriod).toBe("600000");
    expect(claim.periodResetsAt).toBe(periodStart + 3600);
    expect(claim.status).toBe("active");

    const exhausted = buildPolicyClaims([
      policyWith({
        payAsYouGo: {
          maxAmountPerPeriod: bn(1_000_000),
          maxChunkAmount: bn(100_000),
          periodLengthSeconds: bn(3600),
          currentPeriodStart: bn(periodStart),
          currentPeriodTotal: bn(1_000_000),
        },
      }),
    ])[0];
    expect(exhausted.status).toBe("exhausted");
  });

  it("oneTime: pending/completed/expired transitions + sentinel handling", () => {
    const claim = buildPolicyClaims([
      policyWith({
        oneTime: {
          amount: bn(500_000),
          dueDate: bn(-1), // immediate
          expiryDate: { some: bn(Math.floor(Date.now() / 1000) + 86400) },
        },
      }),
    ])[0];
    expect(claim.variant).toBe("oneTime");
    expect(claim.dueDate).toBeNull();
    expect(claim.status).toBe("pending");

    const completed = buildPolicyClaims([
      policyWith(
        {
          oneTime: {
            amount: bn(500_000),
            dueDate: bn(-1),
            expiryDate: { none: {} },
          },
        },
        { status: { completed: {} } }
      ),
    ])[0];
    expect(completed.status).toBe("completed");
    expect(completed.expiryDate).toBeNull();

    const expired = buildPolicyClaims([
      policyWith({
        oneTime: {
          amount: bn(500_000),
          dueDate: bn(-1),
          expiryDate: { some: bn(Math.floor(Date.now() / 1000) - 100) },
        },
      }),
    ])[0];
    expect(expired.status).toBe("expired");
  });

  it("upTo: pending/settled/expired transitions", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const claim = buildPolicyClaims([
      policyWith({
        upTo: {
          maxAmount: bn(2_000_000),
          validAfter: bn(-1), // immediate
          deadline: bn(future),
        },
      }),
    ])[0];
    expect(claim.variant).toBe("upTo");
    expect(claim.validAfter).toBeNull();
    expect(claim.deadline).toBe(future);
    expect(claim.status).toBe("pending");

    const settled = buildPolicyClaims([
      policyWith(
        {
          upTo: {
            maxAmount: bn(2_000_000),
            validAfter: bn(-1),
            deadline: bn(future),
          },
        },
        { status: { completed: {} } }
      ),
    ])[0];
    expect(settled.status).toBe("settled");

    const expired = buildPolicyClaims([
      policyWith({
        upTo: {
          maxAmount: bn(2_000_000),
          validAfter: bn(-1),
          deadline: bn(Math.floor(Date.now() / 1000) - 100),
        },
      }),
    ])[0];
    expect(expired.status).toBe("expired");
  });

  it("drops policies with no recognized variant", () => {
    const out = buildPolicyClaims([
      { ...basePolicy, policyType: undefined },
      { ...basePolicy, policyType: { unknownVariant: {} } },
    ]);
    expect(out).toEqual([]);
  });

  it("mixes multiple variants in one call", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const out = buildPolicyClaims([
      policyWith({
        subscription: {
          amount: bn(1_000_000),
          autoRenew: true,
          maxRenewals: null,
          paymentFrequency: { Monthly: {} },
          nextPaymentDue: future,
        },
      }),
      policyWith({
        upTo: {
          maxAmount: bn(500_000),
          validAfter: bn(-1),
          deadline: bn(future + 1000),
        },
      }),
    ]);
    expect(out.map((c) => c.variant)).toEqual(["subscription", "upTo"]);
  });
});

describe("computePolicyExpiration — per-variant exp source", () => {
  // JWT_EXPIRY_BUFFER_MINUTES / JWT_MAX_TTL_DAYS / JWT_DEFAULT_LIFETIME_SECONDS
  // are read at module import (top-level const in token-issuer.ts), so they
  // can't be tuned per-test. Defaults: buffer=10min (600s), maxTtl=30d,
  // default=1h. Tests below assert against the default buffer of 600s.
  const BUFFER_SEC = 600;
  const DEFAULT_LIFETIME_SEC = 3600;

  const future = Math.floor(Date.now() / 1000) + 86400;

  it("subscription uses nextPaymentDue + buffer", () => {
    const now = Math.floor(Date.now() / 1000);
    const exp = computePolicyExpiration([
      {
        variant: "subscription",
        policyAddress: "p",
        policyId: 1,
        recipient: "r",
        gateway: "g",
        memo: "",
        createdAt: now,
        amount: "1",
        paymentFrequency: "monthly",
        totalPayments: 0,
        nextPaymentDue: future,
        status: "paid",
        autoRenew: true,
        maxRenewals: null,
      } as any,
    ]);
    expect(exp).toBe(future + BUFFER_SEC);
  });

  it("milestone uses last milestoneTimestamp + buffer", () => {
    const now = Math.floor(Date.now() / 1000);
    const exp = computePolicyExpiration([
      {
        variant: "milestone",
        policyAddress: "p",
        policyId: 1,
        recipient: "r",
        gateway: "g",
        memo: "",
        createdAt: now,
        milestoneAmounts: ["1", "2"],
        milestoneTimestamps: [now + 100, now + 200],
        currentMilestone: 0,
        totalMilestones: 2,
        escrowAmount: "3",
        escrowRemaining: "3",
        releaseCondition: 0,
        status: "active",
      } as any,
    ]);
    expect(exp).toBe(now + 200 + BUFFER_SEC);
  });

  it("payAsYouGo uses periodResetsAt + buffer", () => {
    const now = Math.floor(Date.now() / 1000);
    const exp = computePolicyExpiration([
      {
        variant: "payAsYouGo",
        policyAddress: "p",
        policyId: 1,
        recipient: "r",
        gateway: "g",
        memo: "",
        createdAt: now,
        maxAmountPerPeriod: "100",
        maxChunkAmount: "10",
        periodLengthSeconds: 3600,
        currentPeriodStart: now,
        currentPeriodTotal: "0",
        capRemainingThisPeriod: "100",
        periodResetsAt: now + 3600,
        status: "active",
      } as any,
    ]);
    expect(exp).toBe(now + 3600 + BUFFER_SEC);
  });

  it("oneTime falls back to default when no expiry", () => {
    const now = Math.floor(Date.now() / 1000);
    const exp = computePolicyExpiration([
      {
        variant: "oneTime",
        policyAddress: "p",
        policyId: 1,
        recipient: "r",
        gateway: "g",
        memo: "",
        createdAt: now,
        amount: "1",
        dueDate: null,
        expiryDate: null,
        status: "pending",
      } as any,
    ]);
    expect(exp).toBe(now + DEFAULT_LIFETIME_SEC);
  });

  it("upTo uses hard deadline (no buffer)", () => {
    const now = Math.floor(Date.now() / 1000);
    const exp = computePolicyExpiration([
      {
        variant: "upTo",
        policyAddress: "p",
        policyId: 1,
        recipient: "r",
        gateway: "g",
        memo: "",
        createdAt: now,
        maxAmount: "1",
        validAfter: null,
        deadline: now + 600,
        status: "pending",
      } as any,
    ]);
    expect(exp).toBe(now + 600);
  });

  it("picks the earliest candidate across variants", () => {
    const now = Math.floor(Date.now() / 1000);
    const exp = computePolicyExpiration([
      {
        variant: "subscription",
        nextPaymentDue: now + 10_000,
      } as any,
      {
        variant: "upTo",
        deadline: now + 500,
      } as any,
    ]);
    expect(exp).toBe(now + 500);
  });

  it("empty list returns default lifetime", () => {
    const now = Math.floor(Date.now() / 1000);
    const exp = computePolicyExpiration([]);
    expect(exp).toBe(now + DEFAULT_LIFETIME_SEC);
  });
});
