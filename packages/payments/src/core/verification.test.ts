import {
  TributaryVerifier,
  TributaryJWTPayload,
  PaymentVerificationError,
  SubscriptionVerificationError,
  SubscriptionClaim,
  PaymentRecord,
} from "./verification";

const MOCK_WALLET = "7xKpV2BZQ3HfeRZFMfWVBpDCmCN8eYwGmCjL7m3mVqR";
const MOCK_RECIPIENT = "BxKpT3mZQ5HgeRZFMfWVBpDCmCN8eYwGmCjL7m9mVq";
const MOCK_GATEWAY = "6ntm5rWqDFefET8RFyZV73FcdqxPMbc7Tso3pCMWk4w4";
const MOCK_MEMO = "user_123_monthly_premium";

function buildSubscriptionPayload(
  overrides?: Partial<TributaryJWTPayload>
): TributaryJWTPayload {
  return {
    sub: MOCK_WALLET,
    iss: "https://api.tributary.so",
    aud: "tributary-checkout",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    kid: "test-key-1",
    subscriptions: [
      {
        policyAddress: "DxLp1kP3mZq7HgeRZFMfWVBpDCmCN8eYwGmCjL7m9kR",
        policyId: 1,
        recipient: MOCK_RECIPIENT,
        gateway: MOCK_GATEWAY,
        amount: "100000",
        paymentFrequency: "monthly",
        totalPayments: 3,
        nextPaymentDue: Math.floor(Date.now() / 1000) + 2592000,
        status: "paid",
        autoRenew: true,
        maxRenewals: null,
        createdAt: Math.floor(Date.now() / 1000) - 86400 * 30,
      },
    ],
    lastPayments: [
      {
        signature: "5UfK2hZ8rN3mQ9pL7wX1vB4cY6dA0eT2gR8nJ5sF3oH9kM7uP",
        slot: 245123456,
        timestamp: Math.floor(Date.now() / 1000) - 100,
        policyAddress: "DxLp1kP3mZq7HgeRZFMfWVBpDCmCN8eYwGmCjL7m9kR",
        amount: "100000",
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        payer: MOCK_WALLET,
        recipient: MOCK_RECIPIENT,
        gateway: MOCK_GATEWAY,
        memo: MOCK_MEMO,
        recordId: 3,
      },
    ],
    ...overrides,
  };
}

function buildOneTimePayload(
  overrides?: Partial<TributaryJWTPayload>
): TributaryJWTPayload {
  return {
    sub: MOCK_WALLET,
    iss: "https://api.tributary.so",
    aud: "tributary-checkout",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    kid: "test-key-1",
    subscriptions: [],
    lastPayments: [
      {
        signature: "2kPm9qR4vT5wN8sX1zB6cY3dA7eF0hG9jL2nK5oI3rJ8tM6uQ",
        slot: 245098200,
        timestamp: Math.floor(Date.now() / 1000) - 200,
        policyAddress: "11111111111111111111111111111111",
        amount: "499900",
        tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        payer: MOCK_WALLET,
        recipient: MOCK_RECIPIENT,
        gateway: MOCK_GATEWAY,
        memo: MOCK_MEMO,
        recordId: 0,
      },
    ],
    ...overrides,
  };
}

function createVerifier(verifyResult: TributaryJWTPayload): TributaryVerifier {
  const verifier = new TributaryVerifier({ baseUrl: "https://mock.local" });
  (verifier as any).verify = jest.fn().mockResolvedValue(verifyResult);
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
      const payload = buildOneTimePayload();
      const verifier = createVerifier(payload);
      const payment = await verifier.verifyPayment("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        memo: MOCK_MEMO,
      });

      expect(payment.recipient).toBe(MOCK_RECIPIENT);
      expect(payment.payer).toBe(MOCK_WALLET);
      expect(payment.memo).toBe(MOCK_MEMO);
      expect(payment.amount).toBe("499900");
    });

    it("should confirm a subscription payment from lastPayments", async () => {
      const payload = buildSubscriptionPayload();
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
      const payload = buildOneTimePayload();
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
      const payload = buildOneTimePayload();
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
      const payload = buildOneTimePayload();
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
      const payload = buildOneTimePayload({ lastPayments: [] });
      const verifier = createVerifier(payload);

      await expect(
        verifier.verifyPayment("mock-token", {
          recipient: MOCK_RECIPIENT,
          wallet: MOCK_WALLET,
          memo: MOCK_MEMO,
        })
      ).rejects.toThrow(PaymentVerificationError);
    });

    it("should match memo by substring inclusion", async () => {
      const payload = buildOneTimePayload();
      payload.lastPayments[0].memo = "trib_order_12345_item";
      const verifier = createVerifier(payload);

      const payment = await verifier.verifyPayment("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        memo: "trib_order_12345_item",
      });

      expect(payment.memo).toBe("trib_order_12345_item");
    });

    it("should include details in error when no match found", async () => {
      const payload = buildOneTimePayload();
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

  describe("verifySubscription", () => {
    it("should confirm an active paid subscription", async () => {
      const payload = buildSubscriptionPayload();
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
      const payload = buildSubscriptionPayload();
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
      const payload = buildSubscriptionPayload();
      payload.subscriptions[0].status = "overdue";
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
      const payload = buildSubscriptionPayload();
      payload.subscriptions[0].status = "completed";
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
      const payload = buildSubscriptionPayload();
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
      const payload = buildSubscriptionPayload();
      payload.subscriptions[0].status = "overdue";
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
      const payload = buildSubscriptionPayload();
      payload.lastPayments[0].memo = "something_else_entirely";
      const verifier = createVerifier(payload);

      await expect(
        verifier.verifySubscription("mock-token", {
          recipient: MOCK_RECIPIENT,
          wallet: MOCK_WALLET,
          memo: MOCK_MEMO,
        })
      ).rejects.toThrow(/no payment found with memo/);
    });

    it("should reject when subscriptions array is empty", async () => {
      const payload = buildSubscriptionPayload({ subscriptions: [] });
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
      const payload = buildSubscriptionPayload();
      const verifier = createVerifier(payload);

      const sub = await verifier.verifySubscription("mock-token", {
        recipient: MOCK_RECIPIENT,
        wallet: MOCK_WALLET,
        memo: MOCK_MEMO,
      });

      expect(sub.status).toBe("paid");
      expect(sub.paymentFrequency).toBe("monthly");
    });
  });

  describe("error types", () => {
    it("PaymentVerificationError should be a VerificationError", () => {
      const err = new PaymentVerificationError("test");
      expect(err.name).toBe("PaymentVerificationError");
      expect(err.message).toBe("test");
    });

    it("SubscriptionVerificationError should be a VerificationError", () => {
      const err = new SubscriptionVerificationError("test");
      expect(err.name).toBe("SubscriptionVerificationError");
      expect(err.message).toBe("test");
    });
  });
});
