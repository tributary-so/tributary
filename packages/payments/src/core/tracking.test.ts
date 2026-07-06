// @ts-nocheck
// Unit tests for PaymentTracker (G-4, review 2026-07-06).
//
// The on-chain lookups (`getPoliciesByGateway`, `getPoliciesByOwner`,
// `getPaymentPoliciesForOptions`) all delegate to the Tributary SDK. We
// build the tracker against a fresh mock instance per test and assert the
// lookup methods are called with the right derived PDAs / memcmp filters.
// Without these tests, a regression in any of those delegation paths
// (wrong PDA, wrong memcmp offset, swallowed error) would only surface in
// end-to-end runs.
//
// Note on mocks: setup.ts globally mocks `@tributary-so/sdk` and
// `@solana/web3.js`. The `Tributary` constructor mock returns a shared
// `mockTributary` instance — we reset its methods per test and rebuild the
// tracker against it.

import { Tributary } from "@tributary-so/sdk";
import { PaymentTracker } from "./tracking";

const GATEWAY = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const RECIPIENT = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const WALLET = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/** Build a fresh mocked SDK + tracker pair. Each test gets isolated mocks. */
function makeTracker() {
  const sdk = {
    getUserPaymentPda: jest.fn(() => ({
      address: { toBase58: () => "UserPaymentPda" },
    })),
    getPaymentPoliciesByGateway: jest.fn().mockResolvedValue([]),
    getPaymentPoliciesByUserPayment: jest.fn().mockResolvedValue([]),
    program: {
      account: {
        paymentPolicy: {
          all: jest.fn().mockResolvedValue([]),
        },
      },
    },
  };
  const ctor = Tributary as unknown as jest.Mock;
  ctor.mockImplementation(() => sdk);
  const tracker = new PaymentTracker(
    {} as any,
    new Tributary({} as any, {} as any)
  );
  return { tracker, sdk };
}

describe("PaymentTracker", () => {
  describe("getPoliciesByGateway", () => {
    it("delegates to sdk.getPaymentPoliciesByGateway with a PublicKey", async () => {
      const { tracker, sdk } = makeTracker();
      await tracker.getPoliciesByGateway(GATEWAY);
      expect(sdk.getPaymentPoliciesByGateway).toHaveBeenCalledTimes(1);
      const passed = sdk.getPaymentPoliciesByGateway.mock.calls[0][0];
      // Mocked PublicKey exposes toBase58()
      expect(typeof passed.toBase58).toBe("function");
      expect(passed.toBase58()).toBe(GATEWAY);
    });

    it("returns an empty array on error (swallowed error path)", async () => {
      const { tracker, sdk } = makeTracker();
      sdk.getPaymentPoliciesByGateway.mockRejectedValueOnce(new Error("rpc"));
      const result = await tracker.getPoliciesByGateway(GATEWAY);
      expect(result).toEqual([]);
    });
  });

  describe("getPoliciesByOwner", () => {
    it("derives the user-payment PDA and queries by it", async () => {
      const { tracker, sdk } = makeTracker();
      const userPaymentPda = { toBase58: () => "UserPaymentPda" };
      sdk.getUserPaymentPda = jest.fn(() => ({ address: userPaymentPda }));
      await tracker.getPoliciesByOwner(WALLET, MINT);
      expect(sdk.getUserPaymentPda).toHaveBeenCalledTimes(1);
      // Two PublicKey args (wallet, mint). Mocked ctor exposes toBase58().
      const [walletArg, mintArg] = sdk.getUserPaymentPda.mock.calls[0];
      expect(walletArg.toBase58()).toBe(WALLET);
      expect(mintArg.toBase58()).toBe(MINT);
      expect(sdk.getPaymentPoliciesByUserPayment).toHaveBeenCalledWith(
        userPaymentPda
      );
    });

    it("defaults the token mint to USDC when omitted", async () => {
      const { tracker, sdk } = makeTracker();
      await tracker.getPoliciesByOwner(WALLET);
      const mintArg = sdk.getUserPaymentPda.mock.calls[0][1];
      expect(mintArg.toBase58()).toBe(MINT);
    });

    it("returns an empty array on error (swallowed error path)", async () => {
      const { tracker, sdk } = makeTracker();
      sdk.getUserPaymentPda = jest.fn(() => {
        throw new Error("bad pubkey");
      });
      const result = await tracker.getPoliciesByOwner(WALLET, MINT);
      expect(result).toEqual([]);
    });
  });

  describe("getPaymentPoliciesForOptions", () => {
    it("builds no filters when options is empty", async () => {
      const { tracker, sdk } = makeTracker();
      await tracker.getPaymentPoliciesForOptions({});
      expect(sdk.program.account.paymentPolicy.all).toHaveBeenCalledWith([]);
    });

    it("adds user_payment memcmp at offset 8 when wallet + tokenMint given", async () => {
      const { tracker, sdk } = makeTracker();
      await tracker.getPaymentPoliciesForOptions({
        walletPublicKey: WALLET,
        tokenMint: MINT,
      });
      const filters = sdk.program.account.paymentPolicy.all.mock.calls[0][0];
      expect(filters).toHaveLength(1);
      expect(filters[0].memcmp.offset).toBe(8);
      expect(typeof filters[0].memcmp.bytes).toBe("string");
    });

    it("adds recipient memcmp at offset 8+32", async () => {
      const { tracker, sdk } = makeTracker();
      await tracker.getPaymentPoliciesForOptions({ recipient: RECIPIENT });
      const filters = sdk.program.account.paymentPolicy.all.mock.calls[0][0];
      expect(filters).toHaveLength(1);
      expect(filters[0].memcmp.offset).toBe(8 + 32);
      expect(filters[0].memcmp.bytes).toBe(RECIPIENT);
    });

    it("adds gateway memcmp at offset 8+32+32", async () => {
      const { tracker, sdk } = makeTracker();
      await tracker.getPaymentPoliciesForOptions({
        gatewayPublicKey: GATEWAY,
      });
      const filters = sdk.program.account.paymentPolicy.all.mock.calls[0][0];
      expect(filters).toHaveLength(1);
      expect(filters[0].memcmp.offset).toBe(8 + 32 + 32);
      expect(filters[0].memcmp.bytes).toBe(GATEWAY);
    });

    it("combines wallet + recipient + gateway filters in declaration order", async () => {
      const { tracker, sdk } = makeTracker();
      await tracker.getPaymentPoliciesForOptions({
        walletPublicKey: WALLET,
        tokenMint: MINT,
        recipient: RECIPIENT,
        gatewayPublicKey: GATEWAY,
      });
      const filters = sdk.program.account.paymentPolicy.all.mock.calls[0][0];
      expect(filters).toHaveLength(3);
      expect(filters[0].memcmp.offset).toBe(8);
      expect(filters[1].memcmp.offset).toBe(8 + 32);
      expect(filters[2].memcmp.offset).toBe(8 + 32 + 32);
    });

    it("encodes trackingId via bs58(encodeMemo(id, 64)) at the memo offset", async () => {
      const { tracker, sdk } = makeTracker();
      await tracker.getPaymentPoliciesForOptions({ trackingId: "abc" });
      const filters = sdk.program.account.paymentPolicy.all.mock.calls[0][0];
      expect(filters).toHaveLength(1);
      expect(filters[0].memcmp.offset).toBe(8 + 32 + 32 + 32 + 118);
      // bytes is bs58 of a fixed 64-byte memo buffer; sanity-check shape only.
      expect(typeof filters[0].memcmp.bytes).toBe("string");
      expect(filters[0].memcmp.bytes.length).toBeGreaterThan(0);
    });
  });
});
