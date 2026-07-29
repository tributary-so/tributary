/**
 * Unit tests for createRaydiumCpmmForward (ADR-0030).
 *
 * The Raydium CPMM SDK swap construction is mocked so these run without RPC.
 * The assertions target the same key-transformation logic as the meteora
 * suite, plus the CPMM-specific dual-pin (pool_state + amm_config):
 *
 *  - per-account `isWritable` preserved from `swapIx.keys` (NOT all-true)
 *  - returned accounts never carry `isSigner` (ADR-0008 — type-level)
 *  - `instructionData` is the raw swap instruction data
 *  - `raydiumCpmmForwardConfig` pins programId, discriminator, pool + config
 */
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import BN from "bn.js";
import type { ComposablePolicy, ForwardBuilder } from "@tributary-so/sdk";

const POOL = new PublicKey("BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y");
const AMM_CONFIG = new PublicKey(
  "CwFe1c2aAmT4XWCBDi6CVEqkvNmZfKwccx2vBEqXsX2h"
);
const INPUT_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
); // USDC
const OUTPUT_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
); // WSOL

// ── Mock the Raydium SDK swap construction ────────────────────
// The PDA helpers return deterministic stubs; the swap-instruction
// factory returns a controllable { keys, data } so we can assert the
// builder's key-transformation logic independently of the SDK internals.

let mockSwapIx: { keys: any[]; data: Buffer; programId: PublicKey } | null =
  null;

jest.mock("@raydium-io/raydium-sdk-v2", () => {
  const { PublicKey } = require("@solana/web3.js");
  return {
    makeSwapCpmmBaseInInstruction: () => mockSwapIx,
    getPdaPoolAuthority: () => ({ publicKey: PublicKey.default }),
    getPdaVault: () => ({ publicKey: PublicKey.default }),
    getPdaObservationId: () => ({ publicKey: PublicKey.default }),
  };
});

import {
  createRaydiumCpmmForward,
  createSwapWhenBalanceLow,
} from "./raydium-cpmm";
import { RAYDIUM_CPMM_PUBKEY } from "./constants";

function policy(inputMint: PublicKey, outputMint: PublicKey): ComposablePolicy {
  return {
    forwardConfig: { inputMint, outputMint },
  } as unknown as ComposablePolicy;
}

interface MockKey {
  pubkey: PublicKey;
  isSigner: boolean;
  isWritable: boolean;
}

function setSwapIx(keys: MockKey[], data: Buffer = Buffer.alloc(24, 0)) {
  mockSwapIx = { keys, data, programId: RAYDIUM_CPMM_PUBKEY };
}

const FAKE_CONN = {} as any;
const PDA = new PublicKey("4tNUhEg9oxfAuFDo7N8fto5229D8soQGE1RGyYfvfSwU");

describe("createRaydiumCpmmForward", () => {
  beforeEach(() => {
    mockSwapIx = null;
  });

  test("returns a ForwardBuilder (implements the interface)", () => {
    const builder: ForwardBuilder = createRaydiumCpmmForward({
      pool: POOL,
      ammConfig: AMM_CONFIG,
      slippageBps: 100,
    });
    expect(typeof builder.build).toBe("function");
  });

  test("build() returns non-empty instructionData from swapIx.data", async () => {
    const swapData = Buffer.from([143, 190, 90, 218, 196, 30, 51, 222, 0, 0]);
    setSwapIx(
      [{ pubkey: PublicKey.unique(), isSigner: false, isWritable: true }],
      swapData
    );
    const builder = createRaydiumCpmmForward({
      pool: POOL,
      ammConfig: AMM_CONFIG,
      slippageBps: 100,
    });
    const res = await builder.build({
      connection: FAKE_CONN,
      policy: policy(INPUT_MINT, OUTPUT_MINT),
      composablePolicyPda: PDA,
      face: new BN(1_000_000),
    });
    expect(Buffer.isBuffer(res.instructionData)).toBe(true);
    expect(res.instructionData.equals(swapData)).toBe(true);
  });

  test("build() preserves per-account isWritable from swapIx.keys (NOT all-true)", async () => {
    const keys: MockKey[] = [
      { pubkey: PublicKey.unique(), isSigner: true, isWritable: false },
      { pubkey: PublicKey.unique(), isSigner: false, isWritable: false },
      { pubkey: PublicKey.unique(), isSigner: false, isWritable: true },
    ];
    setSwapIx(keys);
    const builder = createRaydiumCpmmForward({
      pool: POOL,
      ammConfig: AMM_CONFIG,
      slippageBps: 100,
    });
    const res = await builder.build({
      connection: FAKE_CONN,
      policy: policy(INPUT_MINT, OUTPUT_MINT),
      composablePolicyPda: PDA,
      face: new BN(1_000_000),
    });
    expect(res.forwardAccounts.map((a) => a.isWritable)).toEqual([
      false,
      false,
      true,
    ]);
  });

  test("build() never emits isSigner on forwardAccounts", async () => {
    const keys: MockKey[] = [
      { pubkey: PublicKey.unique(), isSigner: true, isWritable: true },
      { pubkey: PublicKey.unique(), isSigner: false, isWritable: false },
    ];
    setSwapIx(keys);
    const builder = createRaydiumCpmmForward({
      pool: POOL,
      ammConfig: AMM_CONFIG,
      slippageBps: 100,
    });
    const res = await builder.build({
      connection: FAKE_CONN,
      policy: policy(INPUT_MINT, OUTPUT_MINT),
      composablePolicyPda: PDA,
      face: new BN(1_000_000),
    });
    for (const a of res.forwardAccounts) {
      expect(a).not.toHaveProperty("isSigner");
    }
  });
});

describe("createSwapWhenBalanceLow (CPMM)", () => {
  const RECIPIENT = new PublicKey(
    "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
  );
  const POLICY_TYPE = {
    subscription: {
      amount: new BN(1_000_000),
      paymentFrequency: new BN(86400),
      maxRenewals: 12,
      autoRenew: true,
      nextPaymentDue: new BN(0),
    },
  } as any;

  // CPMM build() is mocked above; reset mockSwapIx so the recipe's
  // forwardBuilder is constructable (we don't call build() here).
  beforeEach(() => {
    mockSwapIx = null;
  });

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
        RAYDIUM_CPMM_PUBKEY
      )
    ).toBe(true);
    expect("programCall" in create.preValidation).toBe(true);
    expect("disabled" in create.postValidation).toBe(true);
    expect(create.preValidationInit.pinnedAccounts.length).toBeGreaterThan(0);
    expect(typeof forwardBuilder.build).toBe("function");
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
    const warned = warnSpy.mock.calls
      .map((c) => String(c[0]))
      .some((m) => /deliver-transform/.test(m));
    expect(warned).toBe(false);
  });
});
