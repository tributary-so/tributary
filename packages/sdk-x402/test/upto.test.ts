/**
 * Unit tests for the x402 `upto` scheme — single-use, time-bound,
 * variable-amount authorization.
 *
 * Covers:
 *   - Payment-Required header includes `maxAmount`, `validAfter`, `deadline`
 *     for the `x402://upto` scheme.
 *   - Phase-dependent amount: verify-time `amount` = ceiling (`maxAmount`).
 *   - `verifyUpToAuthorization` reads maxAmount from the on-chain policy
 *     (does NOT trust a caller-supplied settle amount).
 *   - `settleUpTo` delegates to `sdk.executePayment` with the actual amount.
 */
// @ts-nocheck - Disable type checking for test file with complex mocks
import "jest";
import { jest, describe, it, expect } from "@jest/globals";

jest.mock("@coral-xyz/anchor", () => ({}));

jest.mock("bn.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((n: number) => ({
    toNumber: () => n,
    toString: () => String(n),
    sub: jest.fn().mockReturnValue({ toNumber: () => 0 }),
    lt: jest.fn().mockReturnValue(false),
    eq: (other: any) => n === other.toNumber(),
  })),
}));

import { createX402Middleware } from "../src/middleware";
import { verifyUpToAuthorization, settleUpTo } from "../src/upto";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// BN-like helper for mock account data (mirrors what the real SDK returns).
const bn = (n: number) => ({
  toNumber: () => n,
  toString: () => String(n),
  eq: (other: any) => n === other.toNumber(),
});

// Real base58 strings — `PublicKey` is the real constructor.
const USER_PK = "8EVBvLDVhJUw1nkAUp73mPowviVFK9Wza5ba1GRANEw1";
const MINT_PK = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const GATEWAY_PK = "ConTf7Qf3r1QoDDLcLTMVxLrzzvPTPrwzEYJrjqm1U7";
const RECIPIENT_PK = "9xQeWvG816bUx9EPa2Q3fN1eQ4kzW8bJ3bC5dD6mEoP2";
const POLICY_PK = "11111111111111111111111111111112";

describe("x402 upto scheme", () => {
  describe("Payment-Required header", () => {
    let mockReq: Record<string, any>;
    let mockRes: Record<string, any>;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = {
        header: jest.fn().mockReturnValue(undefined),
        get: jest.fn().mockReturnValue("localhost:3000"),
        protocol: "http",
        originalUrl: "/api/llm",
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    it("includes maxAmount, validAfter, deadline for x402://upto", async () => {
      const middleware = createX402Middleware({
        scheme: "x402://upto",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        amount: 1_000_000,
        maxAmount: 1_000_000,
        validAfter: 1_700_000_000,
        deadline: 1_800_000_000,
        recipient: RECIPIENT_PK,
        gateway: GATEWAY_PK,
        tokenMint: MINT_PK,
        jwtSecret: "test-secret",
        sdk: {} as any,
        connection: {} as any,
      });

      await middleware(mockReq, mockRes, mockNext);

      const headerCall = mockRes.set.mock.calls[0];
      expect(headerCall[0]).toBe("payment-required");
      expect(headerCall[1]).toContain('scheme="x402://upto"');
      expect(headerCall[1]).toContain("maxAmount=1000000");
      expect(headerCall[1]).toContain("validAfter=1700000000");
      expect(headerCall[1]).toContain("deadline=1800000000");
    });

    it("emits the accepts array with upto params", async () => {
      const middleware = createX402Middleware({
        scheme: "x402://upto",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        amount: 1_000_000,
        maxAmount: 1_000_000,
        deadline: 1_800_000_000,
        recipient: RECIPIENT_PK,
        gateway: GATEWAY_PK,
        tokenMint: MINT_PK,
        jwtSecret: "s",
        sdk: {} as any,
        connection: {} as any,
      });

      await middleware(mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.accepts[0].scheme).toBe("x402://upto");
      expect(jsonCall.accepts[0].maxAmount).toBe(1_000_000);
      expect(jsonCall.accepts[0].deadline).toBe(1_800_000_000);
      expect(jsonCall.accepts[0].id).toMatch(/^upto_\d+_/);
    });
  });

  describe("verifyUpToAuthorization", () => {
    function makeMockSdk(policies: any[]): any {
      return {
        getUserPaymentPda: () => ({ address: "mockUserPaymentPda" }),
        getPaymentPoliciesByUser: jest.fn().mockResolvedValue(policies),
        getUserPayment: jest
          .fn()
          .mockResolvedValue({ tokenMint: new PublicKey(MINT_PK) }),
        executePayment: jest.fn().mockResolvedValue(["mockInstruction"]),
      };
    }

    it("reads maxAmount from the on-chain policy, not the caller", async () => {
      const sdk = makeMockSdk([
        {
          publicKey: new PublicKey(POLICY_PK),
          account: {
            createdAt: { sub: () => ({ toNumber: () => 1 }) },
            status: { active: {} },
            policyType: { payAsYouGo: { maxAmountPerPeriod: bn(50) } },
            gateway: new PublicKey(GATEWAY_PK),
            recipient: new PublicKey(RECIPIENT_PK),
            userPayment: "mockUserPaymentPda",
          },
        },
        {
          publicKey: new PublicKey(POLICY_PK),
          account: {
            createdAt: { sub: () => ({ toNumber: () => 100 }) },
            status: { active: {} },
            policyType: {
              upTo: { maxAmount: bn(1_000_000), deadline: bn(9_999_999_999) },
            },
            gateway: new PublicKey(GATEWAY_PK),
            recipient: new PublicKey(RECIPIENT_PK),
            userPayment: "mockUserPaymentPda",
          },
        },
      ]);

      const result = await verifyUpToAuthorization(
        sdk,
        new PublicKey(USER_PK),
        1_000_000,
        new PublicKey(MINT_PK),
        new PublicKey(GATEWAY_PK),
        new PublicKey(RECIPIENT_PK)
      );

      expect(result.success).toBe(true);
    });

    it("fails when on-chain maxAmount does not match the expected ceiling", async () => {
      const sdk = makeMockSdk([
        {
          publicKey: new PublicKey(POLICY_PK),
          account: {
            createdAt: { sub: () => ({ toNumber: () => 1 }) },
            status: { active: {} },
            policyType: {
              upTo: { maxAmount: bn(500_000), deadline: bn(9_999_999_999) },
            },
            gateway: new PublicKey(GATEWAY_PK),
            recipient: new PublicKey(RECIPIENT_PK),
            userPayment: "mockUserPaymentPda",
          },
        },
      ]);

      const result = await verifyUpToAuthorization(
        sdk,
        new PublicKey(USER_PK),
        1_000_000,
        new PublicKey(MINT_PK),
        new PublicKey(GATEWAY_PK),
        new PublicKey(RECIPIENT_PK)
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/500000.*1000000/);
    });

    it("fails when no active UpTo policy exists", async () => {
      const sdk = makeMockSdk([
        {
          account: {
            status: { active: {} },
            policyType: { payAsYouGo: {} },
          },
        },
      ]);

      const result = await verifyUpToAuthorization(
        sdk,
        new PublicKey(USER_PK),
        1_000_000,
        new PublicKey(MINT_PK),
        new PublicKey(GATEWAY_PK),
        new PublicKey(RECIPIENT_PK)
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No active upto policies/);
    });
  });

  describe("settleUpTo", () => {
    it("delegates to sdk.executePayment with the actual amount", async () => {
      const sdk = {
        executePayment: jest.fn().mockResolvedValue(["mockInstruction"]),
      } as any;
      await settleUpTo(sdk, new PublicKey(POLICY_PK), 42_000_000);

      expect(sdk.executePayment).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(BN)
      );
      const calledAmount = (sdk.executePayment as jest.Mock).mock.calls[0][1];
      expect(calledAmount.toNumber()).toBe(42_000_000);
    });

    it("accepts a BN amount directly", async () => {
      const sdk = {
        executePayment: jest.fn().mockResolvedValue(["mockInstruction"]),
      } as any;
      await settleUpTo(sdk, new PublicKey(POLICY_PK), new BN(7));

      expect(sdk.executePayment).toHaveBeenCalled();
    });
  });
});
