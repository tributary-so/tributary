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
import { PaymentTracker, ComposablePolicyTracker } from "./tracking";

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

// ComposablePolicyTracker tests (tributary-fqro).
//
// Unlike PaymentTracker, ComposablePolicyTracker does NOT build memcmp
// filters itself — it translates PolicyLookupOptions into the SDK's
// `{userPayment?, gateway?, recipient?, trackingId?}` shape and delegates
// to `sdk.getComposablePolicies(filters)`. The SDK owns the offsets.
// These tests verify: (a) the option→filter translation, (b) delegation
// to the SDK, and (c) normalization of raw accounts into the API shape
// (memo decoded, BN→number, padding/bump stripped, policyAccount carried).

const POLICY_PUBKEY = "PolicyAccountPubkey111111111111111111111111111";

/** Build a fresh mocked SDK + ComposablePolicyTracker pair. */
function makeComposableTracker() {
  const sdk = {
    getUserPaymentPda: jest.fn(() => ({
      address: { toBase58: () => "UserPaymentPda" },
    })),
    getComposablePolicies: jest.fn().mockResolvedValue([]),
  };
  const ctor = Tributary as unknown as jest.Mock;
  ctor.mockImplementation(() => sdk);
  const tracker = new ComposablePolicyTracker(
    {} as any,
    new Tributary({} as any, {} as any)
  );
  return { tracker, sdk };
}

/** Build a raw ComposablePolicy-shaped account for normalization tests. */
function makeRawComposableAccount(overrides: Record<string, any> = {}) {
  return {
    userPayment: "UserPaymentPda",
    gateway: GATEWAY,
    recipient: RECIPIENT,
    bump: 255,
    status: { active: {} },
    rentPayer: { user: {} },
    policyType: { subscription: {} },
    forwardConfig: {
      instructionConstraint: { programId: "ProgramId".padEnd(32, "1") },
      inputMint: MINT,
      outputMint: MINT,
      forwardFlags: 0,
    },
    preValidation: { disabled: {} },
    postValidation: { disabled: {} },
    memo: [97, 98, 99, 0, 0], // "abc" + null padding
    padding: [0, 0, 0],
    totalInput: { toNumber: () => 1500 },
    totalOutput: { toNumber: () => 2900 },
    createdAt: { toNumber: () => 1700000000 },
    updatedAt: { toNumber: () => 1700000123 },
    ...overrides,
  };
}

describe("ComposablePolicyTracker", () => {
  describe("getComposablePoliciesForOptions — filter translation", () => {
    it("delegates to sdk.getComposablePolicies with empty filters when no options given", async () => {
      const { tracker, sdk } = makeComposableTracker();
      await tracker.getComposablePoliciesForOptions({});
      expect(sdk.getComposablePolicies).toHaveBeenCalledTimes(1);
      expect(sdk.getComposablePolicies).toHaveBeenCalledWith({});
    });

    it("translates gatewayPublicKey into {gateway: PublicKey}", async () => {
      const { tracker, sdk } = makeComposableTracker();
      await tracker.getComposablePoliciesForOptions({
        gatewayPublicKey: GATEWAY,
      });
      const passed = sdk.getComposablePolicies.mock.calls[0][0];
      expect(passed.gateway).toBeDefined();
      expect(passed.gateway.toBase58()).toBe(GATEWAY);
      // No other filters leaked in.
      expect(Object.keys(passed)).toEqual(["gateway"]);
    });

    it("derives userPayment PDA from wallet + tokenMint pair", async () => {
      const { tracker, sdk } = makeComposableTracker();
      await tracker.getComposablePoliciesForOptions({
        walletPublicKey: WALLET,
        tokenMint: MINT,
      });
      expect(sdk.getUserPaymentPda).toHaveBeenCalledTimes(1);
      const [walletArg, mintArg] = sdk.getUserPaymentPda.mock.calls[0];
      expect(walletArg.toBase58()).toBe(WALLET);
      expect(mintArg.toBase58()).toBe(MINT);
      const passed = sdk.getComposablePolicies.mock.calls[0][0];
      expect(passed.userPayment).toBeDefined();
      expect(passed.userPayment.toBase58()).toBe("UserPaymentPda");
    });

    it("translates recipient into {recipient: PublicKey}", async () => {
      const { tracker, sdk } = makeComposableTracker();
      await tracker.getComposablePoliciesForOptions({ recipient: RECIPIENT });
      const passed = sdk.getComposablePolicies.mock.calls[0][0];
      expect(passed.recipient).toBeDefined();
      expect(passed.recipient.toBase58()).toBe(RECIPIENT);
      expect(Object.keys(passed)).toEqual(["recipient"]);
    });

    it("passes trackingId through verbatim (SDK owns memo encoding)", async () => {
      const { tracker, sdk } = makeComposableTracker();
      await tracker.getComposablePoliciesForOptions({ trackingId: "order-42" });
      const passed = sdk.getComposablePolicies.mock.calls[0][0];
      expect(passed.trackingId).toBe("order-42");
      expect(Object.keys(passed)).toEqual(["trackingId"]);
    });

    it("combines all filter options in a single delegation call", async () => {
      const { tracker, sdk } = makeComposableTracker();
      await tracker.getComposablePoliciesForOptions({
        walletPublicKey: WALLET,
        tokenMint: MINT,
        gatewayPublicKey: GATEWAY,
        recipient: RECIPIENT,
        trackingId: "combo",
      });
      expect(sdk.getComposablePolicies).toHaveBeenCalledTimes(1);
      const passed = sdk.getComposablePolicies.mock.calls[0][0];
      expect(Object.keys(passed).sort()).toEqual(
        ["gateway", "recipient", "trackingId", "userPayment"].sort()
      );
    });
  });

  describe("getComposablePoliciesForOptions — normalization", () => {
    it("decodes the 32-byte memo via decodeMemo", async () => {
      const { decodeMemo } = require("@tributary-so/sdk");
      const { tracker, sdk } = makeComposableTracker();
      sdk.getComposablePolicies.mockResolvedValueOnce([
        {
          publicKey: { toBase58: () => POLICY_PUBKEY },
          account: makeRawComposableAccount({ memo: [120, 121, 122, 0] }),
        },
      ]);
      const [result] = await tracker.getComposablePoliciesForOptions({
        gatewayPublicKey: GATEWAY,
      });
      expect(decodeMemo).toHaveBeenCalledWith([120, 121, 122, 0]);
      expect(result.memo).toBe("decoded-memo");
    });

    it("converts totalInput / totalOutput BN fields to numbers", async () => {
      const { tracker, sdk } = makeComposableTracker();
      sdk.getComposablePolicies.mockResolvedValueOnce([
        {
          publicKey: { toBase58: () => POLICY_PUBKEY },
          account: makeRawComposableAccount({
            totalInput: { toNumber: () => 9999 },
            totalOutput: { toNumber: () => 8888 },
          }),
        },
      ]);
      const [result] = await tracker.getComposablePoliciesForOptions({});
      expect(result.totalInput).toBe(9999);
      expect(result.totalOutput).toBe(8888);
      expect(typeof result.totalInput).toBe("number");
      expect(typeof result.totalOutput).toBe("number");
    });

    it("converts createdAt / updatedAt BN timestamps to numbers", async () => {
      const { tracker, sdk } = makeComposableTracker();
      sdk.getComposablePolicies.mockResolvedValueOnce([
        {
          publicKey: { toBase58: () => POLICY_PUBKEY },
          account: makeRawComposableAccount({
            createdAt: { toNumber: () => 1700000456 },
            updatedAt: { toNumber: () => 1700000789 },
          }),
        },
      ]);
      const [result] = await tracker.getComposablePoliciesForOptions({});
      expect(result.createdAt).toBe(1700000456);
      expect(result.updatedAt).toBe(1700000789);
    });

    it("strips padding and bump bookkeeping fields (set to undefined)", async () => {
      const { tracker, sdk } = makeComposableTracker();
      sdk.getComposablePolicies.mockResolvedValueOnce([
        {
          publicKey: { toBase58: () => POLICY_PUBKEY },
          account: makeRawComposableAccount(),
        },
      ]);
      const [result] = await tracker.getComposablePoliciesForOptions({});
      expect(result.bump).toBeUndefined();
      expect(result.padding).toBeUndefined();
    });

    it("carries the account publicKey as policyAccount", async () => {
      const { tracker, sdk } = makeComposableTracker();
      const pk = { toBase58: () => POLICY_PUBKEY };
      sdk.getComposablePolicies.mockResolvedValueOnce([
        { publicKey: pk, account: makeRawComposableAccount() },
      ]);
      const [result] = await tracker.getComposablePoliciesForOptions({});
      expect(result.policyAccount).toBe(pk);
    });

    it("returns one normalized entry per raw account (preserves order)", async () => {
      const { tracker, sdk } = makeComposableTracker();
      sdk.getComposablePolicies.mockResolvedValueOnce([
        {
          publicKey: { toBase58: () => "Policy1" },
          account: makeRawComposableAccount(),
        },
        {
          publicKey: { toBase58: () => "Policy2" },
          account: makeRawComposableAccount(),
        },
      ]);
      const results = await tracker.getComposablePoliciesForOptions({});
      expect(results).toHaveLength(2);
      expect(results[0].policyAccount.toBase58()).toBe("Policy1");
      expect(results[1].policyAccount.toBase58()).toBe("Policy2");
    });
  });
});
