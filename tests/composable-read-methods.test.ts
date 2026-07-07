/**
 * Integration tests for SDK composable policy read methods.
 *
 * Verifies getComposablePolicy, getComposablePoliciesByUserPayment,
 * getComposablePoliciesByGateway, and getAllComposablePolicies against
 * a running Surfpool instance with pre-existing state from composable.test.ts.
 *
 * No setup required — reads whatever composable policies already exist on-chain.
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Tributary } from "../target/types/tributary";
import { Tributary as TributarySDK, IWallet } from "../packages/sdk/src";
import { getConfigPda } from "../packages/sdk/src/pda";
import { SurfpoolHelper } from "./surfpool-helpers";

describe("Composable Policy Read Methods (integration)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.tributary as anchor.Program<Tributary>;
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  let sdk: TributarySDK;
  let surfpool: SurfpoolHelper;

  beforeAll(async () => {
    surfpool = new SurfpoolHelper(connection);
    if (!(await surfpool.isSurfpool())) {
      throw new Error(
        "Not running against Surfpool. Start with: surfpool start --legacy-anchor-compatibility --no-tui"
      );
    }
    sdk = new TributarySDK(connection, wallet as IWallet);
  });

  // ─── getAllComposablePolicies: discover existing state ────────────────

  let allPolicies: Array<{ publicKey: PublicKey; account: any }>;

  beforeAll(async () => {
    allPolicies = await sdk.getAllComposablePolicies();
    // If no composable policies exist at all, we still want the negative
    // tests to pass — they assert empty / null results.
  });

  // ─── getComposablePolicy ──────────────────────────────────────────────

  describe("getComposablePolicy", () => {
    test("returns null for a non-existent address", async () => {
      // Use a random key — NOT PublicKey.default (which is System Program and
      // has account data that causes Anchor to throw on discriminator decode).
      const fake = PublicKey.unique();
      const result = await sdk.getComposablePolicy(fake);
      expect(result).toBeNull();
    });

    test("returns policy data for an existing address", async () => {
      // Skip if no composable policies exist on this Surfpool instance
      if (allPolicies.length === 0) return;

      const first = allPolicies[0];
      const result = await sdk.getComposablePolicy(first.publicKey);

      expect(result).not.toBeNull();
      expect(result!.userPayment).toEqual(first.account.userPayment);
      expect(result!.gateway).toEqual(first.account.gateway);
      expect(result!.recipient).toEqual(first.account.recipient);
      expect(result!.policyId).toBe(first.account.policyId);
      expect(result!.bump).toBe(first.account.bump);
    });
  });

  // ─── getComposablePoliciesByUserPayment (memcmp offset 9) ─────────────

  describe("getComposablePoliciesByUserPayment", () => {
    test("returns empty array for a random (non-existent) user payment", async () => {
      const fake = PublicKey.default;
      const result = await sdk.getComposablePoliciesByUserPayment(fake);
      expect(result).toEqual([]);
    });

    test("returns matching policies for a known user payment", async () => {
      if (allPolicies.length === 0) return;

      // Pick the userPayment from the first policy
      const targetUserPayment = allPolicies[0].account.userPayment;
      const result = await sdk.getComposablePoliciesByUserPayment(
        targetUserPayment
      );

      expect(result.length).toBeGreaterThanOrEqual(1);

      // Every returned policy must have this userPayment at offset 9
      for (const p of result) {
        expect(p.account.userPayment).toEqual(targetUserPayment);
      }

      // The policy we queried for must be in the result set
      const resultKeys = new Set(result.map((p) => p.publicKey.toString()));
      expect(resultKeys.has(allPolicies[0].publicKey.toString())).toBe(true);
    });
  });

  // ─── getComposablePoliciesByGateway (memcmp offset 41) ────────────────

  describe("getComposablePoliciesByGateway", () => {
    test("returns empty array for a random (non-existent) gateway", async () => {
      const fake = PublicKey.default;
      const result = await sdk.getComposablePoliciesByGateway(fake);
      expect(result).toEqual([]);
    });

    test("returns matching policies for a known gateway", async () => {
      if (allPolicies.length === 0) return;

      const targetGateway = allPolicies[0].account.gateway;
      const result = await sdk.getComposablePoliciesByGateway(targetGateway);

      expect(result.length).toBeGreaterThanOrEqual(1);

      for (const p of result) {
        expect(p.account.gateway).toEqual(targetGateway);
      }

      const resultKeys = new Set(result.map((p) => p.publicKey.toString()));
      expect(resultKeys.has(allPolicies[0].publicKey.toString())).toBe(true);
    });
  });

  // ─── getAllComposablePolicies ─────────────────────────────────────────

  describe("getAllComposablePolicies", () => {
    test("returns an array", async () => {
      const result = await sdk.getAllComposablePolicies();
      expect(Array.isArray(result)).toBe(true);
    });

    test("all entries have required fields", async () => {
      for (const p of allPolicies) {
        expect(p.account.userPayment).toBeInstanceOf(PublicKey);
        expect(p.account.gateway).toBeInstanceOf(PublicKey);
        expect(p.account.recipient).toBeInstanceOf(PublicKey);
        expect(typeof p.account.policyId).toBe("number");
        expect(typeof p.account.bump).toBe("number");
        expect(typeof p.account.paymentCount).toBe("number");
      }
    });
  });

  // ─── Cross-check: offset correctness (bump:u8 shift) ──────────────────

  describe("memcmp offset cross-check", () => {
    test("byUserPayment and byGateway return consistent sets for the same policy", async () => {
      if (allPolicies.length === 0) return;

      const { userPayment, gateway, publicKey } = allPolicies[0].account;
      const byUp = await sdk.getComposablePoliciesByUserPayment(userPayment);
      const byGw = await sdk.getComposablePoliciesByGateway(gateway);

      const upSet = new Set(byUp.map((p) => p.publicKey.toString()));
      const gwSet = new Set(byGw.map((p) => p.publicKey.toString()));

      // The policy must appear in BOTH filtered sets
      expect(upSet.has(publicKey.toString())).toBe(true);
      expect(gwSet.has(publicKey.toString())).toBe(true);

      // If the offsets were wrong (e.g. copied from PaymentPolicy without
      // the +1 bump shift), one or both of these would fail.
    });
  });
});
