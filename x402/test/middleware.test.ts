/**
 * Unit tests for x402 middleware
 */
// @ts-nocheck - Disable type checking for test file with complex mocks
import "jest";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { createX402Middleware, X402Options } from "../src/middleware";

// Mock dependencies
jest.mock("@tributary-so/sdk", () => ({
  Tributary: jest.fn().mockImplementation(() => ({
    getPaymentPolicy: jest.fn(),
    getPaymentPoliciesByUser: jest.fn(),
    getUserPaymentPda: jest
      .fn()
      .mockReturnValue({ address: "mockUserPaymentPda" }),
  })),
}));

jest.mock("@solana/web3.js", () => ({
  Connection: jest.fn().mockImplementation(() => ({
    simulateTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    sendRawTransaction: jest.fn().mockResolvedValue("mockSignature"),
    confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    getLatestBlockhash: jest.fn().mockResolvedValue({
      blockhash: "mockBlockhash",
      lastValidBlockHeight: 100,
    }),
  })),
  PublicKey: jest
    .fn()
    .mockImplementation((key: string) => ({ toBase58: () => key })),
  Transaction: jest.fn().mockImplementation(() => ({
    feePayer: { toBase58: () => "mockUserPublicKey" },
    serialize: jest.fn().mockReturnValue(Buffer.from("mockTransaction")),
    sign: jest.fn(),
    instructions: [],
  })),
}));

describe("x402 Middleware", () => {
  let mockReq: Record<string, any>;
  let mockRes: Record<string, any>;
  let mockNext: jest.Mock;
  let middleware: any;

  const defaultOptions: X402Options = {
    scheme: "x402://payg",
    network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    amount: 100000,
    recipient: "8EVBvLDVhJUw1nkAUp73mPowviVFK9Wza5ba1GRANEw1",
    gateway: "ConTf7Qf3r1QoDDLcLTMVxLrzzvPTPrwzEYJrjqm1U7",
    tokenMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    maxAmountPerPeriod: 1000000,
    periodLengthSeconds: 86400,
    maxChunkAmount: 100000,
    jwtSecret: "test-secret",
    sdk: {} as any,
    connection: {} as any,
  };

  beforeEach(() => {
    mockReq = {
      header: jest.fn().mockImplementation((header: string) => {
        if (header === "host") return "localhost:3000";
        return undefined;
      }),
      get: jest.fn().mockImplementation((header: string) => {
        if (header === "host") return "localhost:3000";
        return undefined;
      }),
      protocol: "http",
      originalUrl: "/api/premium",
      path: "/api/premium",
      method: "GET",
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    middleware = createX402Middleware(defaultOptions);
  });

  describe("Payment-Required Response", () => {
    it("should return 402 with Payment-Required header when no payment provided", async () => {
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(402);
      expect(mockRes.set).toHaveBeenCalledWith(
        "payment-required",
        expect.stringContaining('scheme="x402://payg"')
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          accepts: expect.arrayContaining([
            expect.objectContaining({
              scheme: "x402://payg",
              network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
              amount: 100000,
              currency: "USDC",
            }),
          ]),
        })
      );
    });

    it("should include proper x402 payment header format", async () => {
      await middleware(mockReq, mockRes, mockNext);

      const paymentRequiredHeader = mockRes.set.mock.calls[0][1];
      expect(paymentRequiredHeader).toContain("x402://payg");
      expect(paymentRequiredHeader).toContain(
        "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
      );
      expect(paymentRequiredHeader).toContain("amount=100000");
      // Values are quoted in the header
      expect(paymentRequiredHeader).toContain(
        'recipient="8EVBvLDVhJUw1nkAUp73mPowviVFK9Wza5ba1GRANEw1"'
      );
    });
  });

  describe("Scheme Support", () => {
    it("should support x402://payg scheme", async () => {
      const paygOptions = {
        ...defaultOptions,
        scheme: "x402://payg",
      };
      const paygMiddleware = createX402Middleware(paygOptions);

      await paygMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith(
        "payment-required",
        expect.stringContaining('scheme="x402://payg"')
      );
    });

    it("should support deferred subscription scheme", async () => {
      const deferredOptions = {
        ...defaultOptions,
        scheme: "deferred",
      };
      const deferredMiddleware = createX402Middleware(deferredOptions);

      await deferredMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith(
        "payment-required",
        expect.stringContaining('scheme="deferred"')
      );
    });
  });

  describe("Payment Accept Array", () => {
    it("should return payment accept array with required fields", async () => {
      await middleware(mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.accepts).toBeDefined();
      expect(Array.isArray(jsonCall.accepts)).toBe(true);
      expect(jsonCall.accepts[0]).toMatchObject({
        scheme: "x402://payg",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        amount: 100000,
        currency: "USDC",
        recipient: "8EVBvLDVhJUw1nkAUp73mPowviVFK9Wza5ba1GRANEw1",
        gateway: "ConTf7Qf3r1QoDDLcLTMVxLrzzvPTPrwzEYJrjqm1U7",
        tokenMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      });
    });

    it("should include maxAmountPerPeriod in accept array", async () => {
      const options = {
        ...defaultOptions,
        maxAmountPerPeriod: 50000,
      };
      const testMiddleware = createX402Middleware(options);

      await testMiddleware(mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.accepts[0].maxAmountPerPeriod).toBe(50000);
    });

    it("should include periodLengthSeconds in accept array", async () => {
      const options = {
        ...defaultOptions,
        periodLengthSeconds: 3600,
      };
      const testMiddleware = createX402Middleware(options);

      await testMiddleware(mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.accepts[0].periodLengthSeconds).toBe(3600);
    });

    it("should include termsUrl in accept array", async () => {
      const options = {
        ...defaultOptions,
        termsUrl: "https://example.com/terms",
      };
      const testMiddleware = createX402Middleware(options);

      await testMiddleware(mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      // termsUrl is included (may have default if not configured)
      expect(jsonCall.accepts[0].termsUrl).toBeDefined();
    });
  });

  describe("Gateway and Recipient Formatting", () => {
    it("should properly format gateway address", async () => {
      await middleware(mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.accepts[0].gateway).toBe(
        "ConTf7Qf3r1QoDDLcLTMVxLrzzvPTPrwzEYJrjqm1U7"
      );
      // Should be a valid base58 string (32+ chars)
      expect(jsonCall.accepts[0].gateway.length).toBeGreaterThan(30);
    });

    it("should properly format recipient address", async () => {
      await middleware(mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.accepts[0].recipient).toBe(
        "8EVBvLDVhJUw1nkAUp73mPowviVFK9Wza5ba1GRANEw1"
      );
      expect(jsonCall.accepts[0].recipient.length).toBeGreaterThan(30);
    });

    it("should properly format tokenMint address", async () => {
      await middleware(mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.accepts[0].tokenMint).toBe(
        "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
      );
      expect(jsonCall.accepts[0].tokenMint.length).toBeGreaterThan(30);
    });
  });

  describe("URL Construction", () => {
    it("should use correct host from request", async () => {
      mockReq.get.mockImplementation((header: string) => {
        if (header === "host") return "api.example.com";
        return undefined;
      });
      mockReq.protocol = "https";
      mockReq.originalUrl = "/v1/users";

      await middleware(mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.accepts[0].resource).toBe(
        "https://api.example.com/v1/users"
      );
    });

    it("should generate unique payment IDs", async () => {
      await middleware(mockReq, mockRes, mockNext);
      const firstCall = mockRes.json.mock.calls[0][0];

      // Reset mocks for second call
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
      };

      await middleware(mockReq, mockRes, mockNext);
      const secondCall = mockRes.json.mock.calls[0][0];

      // IDs should be different due to timestamp
      expect(firstCall.accepts[0].id).not.toBe(secondCall.accepts[0].id);
    });
  });

  describe("Configuration Options", () => {
    it("should handle custom paymentFrequency", async () => {
      const options = {
        ...defaultOptions,
        paymentFrequency: "weekly",
      };
      const testMiddleware = createX402Middleware(options);

      await testMiddleware(mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.accepts[0].paymentFrequency).toBe("weekly");
    });

    it("should handle custom autoRenew", async () => {
      const options = {
        ...defaultOptions,
        autoRenew: true,
      };
      const testMiddleware = createX402Middleware(options);

      await testMiddleware(mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.accepts[0].autoRenew).toBe(true);
    });

    it("should handle custom maxChunkAmount", async () => {
      const options = {
        ...defaultOptions,
        maxChunkAmount: 50000,
      };
      const testMiddleware = createX402Middleware(options);

      await testMiddleware(mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.accepts[0].maxChunkAmount).toBe(50000);
    });
  });
});
