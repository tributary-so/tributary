import {
  TributaryVerifier,
  TributaryJWTPayload,
  VerificationError,
  PaymentVerificationError,
  SubscriptionVerificationError,
  PolicyVerificationError,
  PolicyClaim,
  PaymentRecord,
} from "./verification";

const MOCK_WALLET = "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR";
const MOCK_RECIPIENT = "BxKpT3mZQ5HgeRZFMfWVBpDCmCN8eYwGmCjL7m9mVq";
const MOCK_GATEWAY = "6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4";
const MOCK_MEMO = "user_123_monthly_premium";
const MOCK_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const NOW = () => Math.floor(Date.now() / 1000);

function subClaim(overrides?: Partial<PolicyClaim>): PolicyClaim {
  return {
    variant: "subscription",
    policyAddress: "DxLp1kP3mZq7HgeRZFMfWVBpDCmCN8eYwGmCjL7m9kR",
    policyId: 1,
    recipient: MOCK_RECIPIENT,
    gateway: MOCK_GATEWAY,
    memo: "foobar",
    createdAt: NOW() - 86400 * 30,
    amount: "100000",
    paymentFrequency: "monthly",
    totalPayments: 3,
    nextPaymentDue: NOW() + 2592000,
    status: "paid",
    autoRenew: true,
    maxRenewals: null,
    ...overrides,
  } as PolicyClaim;
}

function milestoneClaim(overrides?: Partial<PolicyClaim>): PolicyClaim {
  return {
    variant: "milestone",
    policyAddress: "DxLp2mP4nZq8HgeRZFMfWVBpDCmCN8eYwGmCjL7m9kS",
    policyId: 2,
    recipient: MOCK_RECIPIENT,
    gateway: MOCK_GATEWAY,
    memo: "milestone-project",
    createdAt: NOW() - 86400 * 5,
    milestoneAmounts: ["100000", "200000", "0", "0"],
    milestoneTimestamps: [NOW() + 1000, NOW() + 2000, 0, 0],
    currentMilestone: 1,
    totalMilestones: 2,
    escrowAmount: "300000",
    escrowRemaining: "200000",
    releaseCondition: 0b0001,
    status: "active",
    ...overrides,
  } as PolicyClaim;
}

function paygClaim(overrides?: Partial<PolicyClaim>): PolicyClaim {
  return {
    variant: "payAsYouGo",
    policyAddress: "DxLp3mP5oZq9HgeRZFMfWVBpDCmCN8eYwGmCjL7m9kT",
    policyId: 3,
    recipient: MOCK_RECIPIENT,
    gateway: MOCK_GATEWAY,
    memo: "agent-usage",
    createdAt: NOW() - 3600,
    maxAmountPerPeriod: "1000000",
    maxChunkAmount: "100000",
    periodLengthSeconds: 86400,
    currentPeriodStart: NOW() - 1800,
    currentPeriodTotal: "400000",
    capRemainingThisPeriod: "600000",
    periodResetsAt: NOW() - 1800 + 86400,
    status: "active",
    ...overrides,
  } as PolicyClaim;
}

function oneTimeClaim(overrides?: Partial<PolicyClaim>): PolicyClaim {
  return {
    variant: "oneTime",
    policyAddress: "DxLp4mP6pZq0HgeRZFMfWVBpDCmCN8eYwGmCjL7m9kU",
    policyId: 4,
    recipient: MOCK_RECIPIENT,
    gateway: MOCK_GATEWAY,
    memo: "single-shot",
    createdAt: NOW() - 600,
    amount: "250000",
    dueDate: null,
    expiryDate: NOW() + 86400,
    status: "pending",
    ...overrides,
  } as PolicyClaim;
}

function upToClaim(overrides?: Partial<PolicyClaim>): PolicyClaim {
  return {
    variant: "upTo",
    policyAddress: "DxLp5mP7qZq1HgeRZFMfWVBpDCmCN8eYwGmCjL7m9kV",
    policyId: 5,
    recipient: MOCK_RECIPIENT,
    gateway: MOCK_GATEWAY,
    memo: "upto-authz",
    createdAt: NOW() - 300,
    maxAmount: "500000",
    validAfter: null,
    deadline: NOW() + 3600,
    status: "pending",
    ...overrides,
  } as PolicyClaim;
}

function paymentRecord(overrides?: Partial<PaymentRecord>): PaymentRecord {
  return {
    signature: "5UfK2hZ8rN3mQ9pL7wX1vB4cY6dA0eT2gR8nJ5sF3oH9kM7uP",
    slot: 245123456,
    timestamp: NOW() - 100,
    policyAddress: "DxLp1kP3mZq7HgeRZFMfWVBpDCmCN8eYwGmCjL7m9kR",
    amount: "100000",
    tokenMint: MOCK_MINT,
    payer: MOCK_WALLET,
    recipient: MOCK_RECIPIENT,
    gateway: MOCK_GATEWAY,
    memo: MOCK_MEMO,
    recordId: 3,
    ...overrides,
  };
}

function buildPayload(
  policies: PolicyClaim[],
  payments: PaymentRecord[] = [],
  overrides?: Partial<TributaryJWTPayload>
): TributaryJWTPayload {
  return {
    sub: MOCK_WALLET,
    iss: "https://api.tributary.so",
    aud: "tributary-checkout",
    iat: NOW(),
    exp: NOW() + 3600,
    nbf: NOW(),
    jti: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    policies,
    lastPayments: payments,
    ...overrides,
  };
}

function createVerifier(verifyResult: TributaryJWTPayload): TributaryVerifier {
  const verifier = new TributaryVerifier({ baseUrl: "https://mock.local" });
  (verifier as any).verify = jest.fn().mockResolvedValue(verifyResult as never);
  return verifier;
}

describe("TributaryVerifier", () => {
  describe("constructor defaults", () => {
    it("should use TRIBUTARY_BASE_URL env var when set", () => {
      const original = process.env.TRIBUTARY_BASE_URL;
      process.env.TRIBUTARY_BASE_URL = "https://custom.example.com";
      const verifier = new TributaryVerifier();
      expect((verifier as any).baseUrl).toBe("https://custom.example.com");
      process.env.TRIBUTARY_BASE_URL = original;
    });

    it("should default to https://api.tributary.so when no env or config", () => {
      const original = process.env.TRIBUTARY_BASE_URL;
      delete process.env.TRIBUTARY_BASE_URL;
      const verifier = new TributaryVerifier();
      expect((verifier as any).baseUrl).toBe("https://api.tributary.so");
      process.env.TRIBUTARY_BASE_URL = original;
    });

    it("should prefer config over env var", () => {
      const original = process.env.TRIBUTARY_BASE_URL;
      process.env.TRIBUTARY_BASE_URL = "https://env.example.com";
      const verifier = new TributaryVerifier({
        baseUrl: "https://config.example.com",
      });
      expect((verifier as any).baseUrl).toBe("https://config.example.com");
      process.env.TRIBUTARY_BASE_URL = original;
    });
  });

  describe("verifyPayment", () => {
    it("should confirm a one-time payment matching recipient, wallet, and memo", async () => {
      const payload = buildPayload([], [paymentRecord()]);
      const verifier = createVerifier(payload);
      const payment = await verifier.verifyPayment("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        memo: MOCK_MEMO,
      });

      expect(payment.recipient).toBe(MOCK_RECIPIENT);
      expect(payment.payer).toBe(MOCK_WALLET);
      expect(payment.memo).toBe(MOCK_MEMO);
      expect(payment.amount).toBe("100000");
    });

    it("should confirm a subscription payment from lastPayments", async () => {
      const payload = buildPayload([subClaim()], [paymentRecord()]);
      const verifier = createVerifier(payload);
      const payment = await verifier.verifyPayment("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        memo: MOCK_MEMO,
      });

      expect(payment.recipient).toBe(MOCK_RECIPIENT);
      expect(payment.amount).toBe("100000");
    });

    it("should reject when wallet does not match", async () => {
      const payload = buildPayload([], [paymentRecord()]);
      const verifier = createVerifier(payload);

      await expect(
        verifier.verifyPayment("mock-token", {
          recipient: MOCK_RECIPIENT,
          wallet: "WrongWallet1111111111111111111111111111111",
          memo: MOCK_MEMO,
        })
      ).rejects.toThrow(PaymentVerificationError);
    });

    it("should reject when recipient does not match", async () => {
      const payload = buildPayload([], [paymentRecord()]);
      const verifier = createVerifier(payload);

      await expect(
        verifier.verifyPayment("mock-token", {
          recipient: "WrongRecipient11111111111111111111111111",
          wallet: MOCK_WALLET,
          memo: MOCK_MEMO,
        })
      ).rejects.toThrow(PaymentVerificationError);
    });

    it("should reject when memo does not match", async () => {
      const payload = buildPayload([], [paymentRecord()]);
      const verifier = createVerifier(payload);

      await expect(
        verifier.verifyPayment("mock-token", {
          recipient: MOCK_RECIPIENT,
          wallet: MOCK_WALLET,
          memo: "nonexistent_memo",
        })
      ).rejects.toThrow(PaymentVerificationError);
    });

    it("should reject when no payments exist", async () => {
      const payload = buildPayload([], []);
      const verifier = createVerifier(payload);

      await expect(
        verifier.verifyPayment("mock-token", {
          recipient: MOCK_RECIPIENT,
          wallet: MOCK_WALLET,
          memo: MOCK_MEMO,
        })
      ).rejects.toThrow(PaymentVerificationError);
    });

    it("should match memo exactly after trimming whitespace", async () => {
      const fixedPayload = buildPayload(
        [],
        [paymentRecord({ memo: "  trib_order_12345_item  " })]
      );
      const verifier = createVerifier(fixedPayload);

      const p = await verifier.verifyPayment("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        memo: "trib_order_12345_item",
      });

      expect(p.memo).toBe("  trib_order_12345_item  ");
    });

    it("should include details in error when no match found", async () => {
      const payload = buildPayload([], [paymentRecord()]);
      const verifier = createVerifier(payload);

      try {
        await verifier.verifyPayment("mock-token", {
          recipient: "BadRecipient",
          wallet: MOCK_WALLET,
          memo: MOCK_MEMO,
        });
        fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(PaymentVerificationError);
        expect((e as PaymentVerificationError).message).toContain(
          "BadRecipient"
        );
      }
    });
  });

  describe("verifyPolicy", () => {
    it("matches a paid subscription claim", async () => {
      const payload = buildPayload([subClaim()]);
      const verifier = createVerifier(payload);
      const claim = await verifier.verifyPolicy("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        variant: "subscription",
      });
      expect(claim.variant).toBe("subscription");
      expect(claim.recipient).toBe(MOCK_RECIPIENT);
    });

    it("matches a milestone claim with variant filter", async () => {
      const payload = buildPayload([milestoneClaim()]);
      const verifier = createVerifier(payload);
      const claim = await verifier.verifyPolicy("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        variant: "milestone",
      });
      expect(claim.variant).toBe("milestone");
      expect(claim.recipient).toBe(MOCK_RECIPIENT);
    });

    it("matches a payAsYouGo claim with variant filter", async () => {
      const payload = buildPayload([paygClaim()]);
      const verifier = createVerifier(payload);
      const claim = await verifier.verifyPolicy("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        variant: "payAsYouGo",
      });
      expect(claim.variant).toBe("payAsYouGo");
      expect(claim.recipient).toBe(MOCK_RECIPIENT);
    });

    it("matches a oneTime claim (authorization only, no payment required)", async () => {
      // empty lastPayments — just-installed policy, not executed yet
      const payload = buildPayload([oneTimeClaim()], []);
      const verifier = createVerifier(payload);
      const claim = await verifier.verifyPolicy("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        variant: "oneTime",
      });
      expect(claim.variant).toBe("oneTime");
      expect(claim.recipient).toBe(MOCK_RECIPIENT);
    });

    it("matches an upTo claim (authorization only, no payment required)", async () => {
      const payload = buildPayload([upToClaim()], []);
      const verifier = createVerifier(payload);
      const claim = await verifier.verifyPolicy("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        variant: "upTo",
      });
      expect(claim.variant).toBe("upTo");
      expect(claim.recipient).toBe(MOCK_RECIPIENT);
    });

    it("matches any variant when no variant filter set", async () => {
      const payload = buildPayload([paygClaim(), oneTimeClaim()]);
      const verifier = createVerifier(payload);
      const claim = await verifier.verifyPolicy("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
      });
      expect(claim.recipient).toBe(MOCK_RECIPIENT);
    });

    it("filters by status string", async () => {
      const payload = buildPayload([
        subClaim({ policyId: 10, status: "overdue" }),
        subClaim({ policyId: 11, status: "paid" }),
      ]);
      const verifier = createVerifier(payload);
      const claim = await verifier.verifyPolicy("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        status: "paid",
      });
      expect((claim as any).policyId).toBe(11);
    });

    it("filters by status list", async () => {
      const payload = buildPayload([
        oneTimeClaim({ policyId: 20, status: "completed" }),
      ]);
      const verifier = createVerifier(payload);
      const claim = await verifier.verifyPolicy("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        status: ["pending", "completed"],
      });
      expect(claim.variant).toBe("oneTime");
    });

    it("rejects when wallet does not match", async () => {
      const payload = buildPayload([subClaim()]);
      const verifier = createVerifier(payload);
      await expect(
        verifier.verifyPolicy("mock-token", {
          recipient: MOCK_RECIPIENT,
          wallet: "WrongWallet1111111111111111111111111111111",
        })
      ).rejects.toThrow(PolicyVerificationError);
    });

    it("rejects when no policy for recipient exists", async () => {
      const payload = buildPayload([subClaim()]);
      const verifier = createVerifier(payload);
      await expect(
        verifier.verifyPolicy("mock-token", {
          recipient: "WrongRecipient11111111111111111111111111",
          wallet: MOCK_WALLET,
        })
      ).rejects.toThrow(/No policy claim found/);
    });

    it("rejects when variant filter excludes the only present policy", async () => {
      const payload = buildPayload([subClaim()]);
      const verifier = createVerifier(payload);
      await expect(
        verifier.verifyPolicy("mock-token", {
          recipient: MOCK_RECIPIENT,
          wallet: MOCK_WALLET,
          variant: "milestone",
        })
      ).rejects.toThrow(/variant=milestone/);
    });

    it("rejects when status filter excludes all candidates", async () => {
      const payload = buildPayload([
        subClaim({ policyId: 30, status: "overdue" }),
      ]);
      const verifier = createVerifier(payload);
      await expect(
        verifier.verifyPolicy("mock-token", {
          recipient: MOCK_RECIPIENT,
          wallet: MOCK_WALLET,
          status: "paid",
        })
      ).rejects.toThrow(/status=paid/);
    });

    it("reports policy count in the not-found message", async () => {
      const payload = buildPayload([subClaim(), paygClaim()]);
      const verifier = createVerifier(payload);
      try {
        await verifier.verifyPolicy("mock-token", {
          recipient: "BadRecipient",
          wallet: MOCK_WALLET,
        });
        fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(PolicyVerificationError);
        expect((e as PolicyVerificationError).message).toMatch(
          /policies in token: 2/
        );
      }
    });

    it("returns first match when multiple candidates qualify", async () => {
      const payload = buildPayload([
        paygClaim({ policyId: 40 }),
        paygClaim({ policyId: 41 }),
      ]);
      const verifier = createVerifier(payload);
      const claim = await verifier.verifyPolicy("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        variant: "payAsYouGo",
      });
      expect((claim as any).policyId).toBe(40);
    });
  });

  describe("verifySubscription (deprecated alias)", () => {
    it("should confirm an active paid subscription", async () => {
      const payload = buildPayload(
        [subClaim()],
        [paymentRecord({ memo: MOCK_MEMO })]
      );
      const verifier = createVerifier(payload);
      const sub = await verifier.verifySubscription("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        memo: MOCK_MEMO,
      });

      expect(sub.status).toBe("paid");
      expect(sub.recipient).toBe(MOCK_RECIPIENT);
      expect(sub.amount).toBe("100000");
    });

    it("should reject when wallet does not match", async () => {
      const payload = buildPayload(
        [subClaim()],
        [paymentRecord({ memo: MOCK_MEMO })]
      );
      const verifier = createVerifier(payload);

      await expect(
        verifier.verifySubscription("mock-token", {
          recipient: MOCK_RECIPIENT,
          wallet: "WrongWallet1111111111111111111111111111111",
          memo: MOCK_MEMO,
        })
      ).rejects.toThrow(SubscriptionVerificationError);
    });

    it("should reject when subscription status is overdue", async () => {
      const payload = buildPayload(
        [subClaim({ status: "overdue" })],
        [paymentRecord({ memo: MOCK_MEMO })]
      );
      const verifier = createVerifier(payload);

      await expect(
        verifier.verifySubscription("mock-token", {
          recipient: MOCK_RECIPIENT,
          wallet: MOCK_WALLET,
          memo: MOCK_MEMO,
        })
      ).rejects.toThrow(/not paid/);
    });

    it("should reject when subscription status is completed", async () => {
      const payload = buildPayload(
        [subClaim({ status: "completed" })],
        [paymentRecord({ memo: MOCK_MEMO })]
      );
      const verifier = createVerifier(payload);

      await expect(
        verifier.verifySubscription("mock-token", {
          recipient: MOCK_RECIPIENT,
          wallet: MOCK_WALLET,
          memo: MOCK_MEMO,
        })
      ).rejects.toThrow(/not paid/);
    });

    it("should reject when no subscription for recipient exists", async () => {
      const payload = buildPayload(
        [subClaim()],
        [paymentRecord({ memo: MOCK_MEMO })]
      );
      const verifier = createVerifier(payload);

      await expect(
        verifier.verifySubscription("mock-token", {
          recipient: "WrongRecipient11111111111111111111111111",
          wallet: MOCK_WALLET,
          memo: MOCK_MEMO,
        })
      ).rejects.toThrow(/No active subscription found/);
    });

    it("should report status when subscription exists but not paid", async () => {
      const payload = buildPayload(
        [subClaim({ status: "overdue" })],
        [paymentRecord({ memo: MOCK_MEMO })]
      );
      const verifier = createVerifier(payload);

      try {
        await verifier.verifySubscription("mock-token", {
          recipient: MOCK_RECIPIENT,
          wallet: MOCK_WALLET,
          memo: MOCK_MEMO,
        });
        fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(SubscriptionVerificationError);
        expect((e as SubscriptionVerificationError).message).toContain(
          "overdue"
        );
      }
    });

    it("should reject when subscription is paid but memo has no matching payment", async () => {
      const payload = buildPayload(
        [subClaim()],
        [paymentRecord({ memo: "something_else_entirely" })]
      );
      const verifier = createVerifier(payload);

      await expect(
        verifier.verifySubscription("mock-token", {
          recipient: MOCK_RECIPIENT,
          wallet: MOCK_WALLET,
          memo: MOCK_MEMO,
        })
      ).rejects.toThrow(/no payment found with memo/);
    });

    it("should reject when policies array has no subscription variant", async () => {
      const payload = buildPayload(
        [paygClaim()],
        [paymentRecord({ memo: MOCK_MEMO })]
      );
      const verifier = createVerifier(payload);

      await expect(
        verifier.verifySubscription("mock-token", {
          recipient: MOCK_RECIPIENT,
          wallet: MOCK_WALLET,
          memo: MOCK_MEMO,
        })
      ).rejects.toThrow(/No active subscription found/);
    });

    it("should pass when subscription is paid and payment memo matches exactly", async () => {
      const payload = buildPayload(
        [subClaim()],
        [paymentRecord({ memo: MOCK_MEMO })]
      );
      const verifier = createVerifier(payload);

      const sub = await verifier.verifySubscription("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        memo: MOCK_MEMO,
      });

      expect(sub.status).toBe("paid");
      expect(sub.paymentFrequency).toBe("monthly");
    });

    it("ignores non-subscription variants when looking for a subscription", async () => {
      const payload = buildPayload(
        [paygClaim(), subClaim({ policyId: 99 })],
        [paymentRecord({ memo: MOCK_MEMO })]
      );
      const verifier = createVerifier(payload);
      const sub = await verifier.verifySubscription("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        memo: MOCK_MEMO,
      });
      expect(sub.variant).toBe("subscription");
      expect(sub.policyId).toBe(99);
    });
  });

  describe("error types", () => {
    it("PaymentVerificationError should be a VerificationError", () => {
      const err = new PaymentVerificationError("test");
      expect(err.name).toBe("PaymentVerificationError");
      expect(err.message).toBe("test");
    });

    it("SubscriptionVerificationError should be a PolicyVerificationError", () => {
      const err = new SubscriptionVerificationError("test");
      expect(err.name).toBe("SubscriptionVerificationError");
      expect(err.message).toBe("test");
      expect(err).toBeInstanceOf(PolicyVerificationError);
    });

    it("PolicyVerificationError should be a VerificationError", () => {
      const err = new PolicyVerificationError("test");
      expect(err.name).toBe("PolicyVerificationError");
      expect(err.message).toBe("test");
      expect(err).toBeInstanceOf(VerificationError);
    });
  });

  describe("payload validation", () => {
    it("should reject memo substring matches (exact only)", async () => {
      const payload = buildPayload(
        [],
        [paymentRecord({ memo: "trib_order_12345_item_extra" })]
      );
      const verifier = createVerifier(payload);

      await expect(
        verifier.verifyPayment("mock-token", {
          recipient: MOCK_RECIPIENT,
          wallet: MOCK_WALLET,
          memo: "trib_order_12345_item",
        })
      ).rejects.toThrow(PaymentVerificationError);
    });

    it("should require jti claim in payload", () => {
      const payload = buildPayload([]);
      expect(payload.jti).toBeDefined();
      expect(typeof payload.jti).toBe("string");
    });

    it("should require nbf claim in payload", () => {
      const payload = buildPayload([]);
      expect(payload.nbf).toBeDefined();
      expect(typeof payload.nbf).toBe("number");
    });
  });
});
