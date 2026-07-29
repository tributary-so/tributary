/**
 * Unit tests for the createSwapWhenBalanceLow named recipe in
 * raydium-clmm.ts (tributary-f2g5).
 *
 * The fire-time `createRaydiumClmmForward` is RPC-heavy (Raydium.load +
 * getPoolInfoFromRpc) and is not exercised here. The `create` bundle,
 * however, is pure composition of raydiumClmmForwardConfig +
 * recipientOutputBalanceCheck + composablePolicyRecipe — so this file
 * covers that layer deterministically without RPC.
 */
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import BN from "bn.js";
import type { ForwardBuilder } from "@tributary-so/sdk";

import {
  createSwapWhenBalanceLow,
} from "./raydium-clmm";
import { RAYDIUM_CLMM_PUBKEY } from "./constants";

const INPUT_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
); // USDC
const OUTPUT_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
); // WSOL
const POOL = new PublicKey("GThUX1ZkoLtEGduy3FwBDbhZsBH2yHtCAJqZ7L3FgWxR");
const AMM_CONFIG = new PublicKey(
  "AMM5cTwN9uy75rYCG6oJ8rLSGo6EKWnVSj2zXn2RFb8N"
);
const RECIPIENT = new PublicKey("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");

const POLICY_TYPE = {
  subscription: {
    amount: new BN(1_000_000),
    paymentFrequency: new BN(86400),
    maxRenewals: 12,
    autoRenew: true,
    nextPaymentDue: new BN(0),
  },
} as any;

describe("createSwapWhenBalanceLow (CLMM)", () => {
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  test("returns { create, forwardBuilder } with the full bundle shape", () => {
    const { create, forwardBuilder } = createSwapWhenBalanceLow({
      policyType: POLICY_TYPE,
      memo: "hot wallet topup",
      recipient: RECIPIENT,
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      ammConfig: AMM_CONFIG,
      slippageBps: 100,
      threshold: 50_000_000,
      op: "<",
    });
    expect(create.policyType).toBe(POLICY_TYPE);
    expect(create.memo).toBe("hot wallet topup");
    expect(create.recipient.equals(RECIPIENT)).toBe(true);
    expect(
      create.forwardConfig.instructionConstraint.programId.equals(
        RAYDIUM_CLMM_PUBKEY
      )
    ).toBe(true);
    expect("programCall" in create.preValidation).toBe(true);
    expect("disabled" in create.postValidation).toBe(true);
    expect(create.preValidationInit.pinnedAccounts.length).toBeGreaterThan(0);
    // forwardBuilder implements the interface (RPC build not exercised).
    expect(typeof forwardBuilder.build).toBe("function");
    // satisfy the unused-import type check
    const _typecheck: ForwardBuilder = forwardBuilder;
    expect(_typecheck).toBe(forwardBuilder);
  });

  test("pre-validation targets the recipient's output ATA", () => {
    const { create } = createSwapWhenBalanceLow({
      policyType: POLICY_TYPE,
      memo: "topup",
      recipient: RECIPIENT,
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      ammConfig: AMM_CONFIG,
      slippageBps: 50,
      threshold: 1,
      op: "<",
    });
    const expectedAta = getAssociatedTokenAddressSync(OUTPUT_MINT, RECIPIENT);
    expect(
      create.preValidationInit.pinnedAccounts[0]!.pubkey.equals(expectedAta)
    ).toBe(true);
  });

  test("deliver-transform swap without post emits the economic warning", () => {
    createSwapWhenBalanceLow({
      policyType: POLICY_TYPE,
      memo: "topup",
      recipient: RECIPIENT,
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      ammConfig: AMM_CONFIG,
      slippageBps: 100,
      threshold: 50_000_000,
      op: "<",
    });
    const warned = warnSpy.mock.calls
      .map((c) => String(c[0]))
      .some((m) => /deliver-transform/.test(m));
    expect(warned).toBe(true);
  });

  test("pins pool + ammConfig on-chain (constraint half of the pair)", () => {
    const { create } = createSwapWhenBalanceLow({
      policyType: POLICY_TYPE,
      memo: "topup",
      recipient: RECIPIENT,
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      ammConfig: AMM_CONFIG,
      slippageBps: 100,
      threshold: 1,
      op: "<",
    });
    expect(
      create.forwardConfig.instructionConstraint.pinnedAccounts[0]!.pubkey.equals(
        POOL
      )
    ).toBe(true);
    expect(
      create.forwardConfig.instructionConstraint.pinnedAccounts[1]!.pubkey.equals(
        AMM_CONFIG
      )
    ).toBe(true);
  });

  test("threads unwrapNativeSol through the forward config", () => {
    const { create } = createSwapWhenBalanceLow({
      policyType: POLICY_TYPE,
      memo: "topup",
      recipient: RECIPIENT,
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      ammConfig: AMM_CONFIG,
      slippageBps: 100,
      threshold: 1,
      op: "<",
      unwrapNativeSol: true,
    });
    expect(create.forwardConfig.forwardFlags).toBe(1);
  });

  test("accepts a caller-supplied post-validation override", () => {
    const post = {
      spec: { programCall: { programId: PublicKey.unique() } } as any,
      init: {
        numPinnedAccounts: 0,
        pinnedAccounts: [],
        validationData: Buffer.alloc(0),
      } as any,
    };
    const { create } = createSwapWhenBalanceLow({
      policyType: POLICY_TYPE,
      memo: "topup",
      recipient: RECIPIENT,
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      ammConfig: AMM_CONFIG,
      slippageBps: 100,
      threshold: 1,
      op: "<",
      post,
    });
    expect(create.postValidation).toBe(post.spec);
    expect(create.postValidationInit).toBe(post.init);
    // post supplied for deliver-transform → no deliver-transform warning
    const warned = warnSpy.mock.calls
      .map((c) => String(c[0]))
      .some((m) => /deliver-transform/.test(m));
    expect(warned).toBe(false);
  });
});
