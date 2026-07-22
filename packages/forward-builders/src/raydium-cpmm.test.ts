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
  raydiumCpmmForwardConfig,
  RAYDIUM_CPMM_SWAP_BASE_INPUT_DISCRIMINATOR,
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

describe("raydiumCpmmForwardConfig", () => {
  test("pins programId = RAYDIUM_CPMM, pool + ammConfig, and mints", () => {
    const cfg = raydiumCpmmForwardConfig({
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      ammConfig: AMM_CONFIG,
    });
    expect(
      cfg.instructionConstraint.programId.equals(RAYDIUM_CPMM_PUBKEY)
    ).toBe(true);
    expect(cfg.instructionConstraint.numPinnedAccounts).toBe(2);
    // pool_state at index 3
    expect(cfg.instructionConstraint.pinnedAccounts[0]!.index).toBe(3);
    expect(
      cfg.instructionConstraint.pinnedAccounts[0]!.pubkey.equals(POOL)
    ).toBe(true);
    // amm_config at index 2
    expect(cfg.instructionConstraint.pinnedAccounts[1]!.index).toBe(2);
    expect(
      cfg.instructionConstraint.pinnedAccounts[1]!.pubkey.equals(AMM_CONFIG)
    ).toBe(true);
    expect(
      cfg.inputMint.equals(INPUT_MINT) && cfg.outputMint.equals(OUTPUT_MINT)
    ).toBe(true);
    // forwardFlags default = 0 (no WSOL unwrap).
    expect(cfg.forwardFlags).toBe(0);
  });

  test("pins the swap_base_input discriminator at dataChecks[0] (offset 0, length 8)", () => {
    const cfg = raydiumCpmmForwardConfig({
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      ammConfig: AMM_CONFIG,
    });
    expect(cfg.instructionConstraint.numDataChecks).toBe(1);
    const check = cfg.instructionConstraint.dataChecks[0]!;
    expect(check.offset).toBe(0);
    expect(check.length).toBe(8);
    expect(Array.from(check.expected)).toEqual([
      ...RAYDIUM_CPMM_SWAP_BASE_INPUT_DISCRIMINATOR,
    ]);
    // Trailing slots remain the empty sentinel.
    for (let i = 1; i < 4; i++) {
      expect(cfg.instructionConstraint.dataChecks[i]!.length).toBe(0);
    }
  });

  test("sets FORWARD_FLAG_NATIVE_OUTPUT (bit 0) when unwrapNativeSol=true", () => {
    const cfg = raydiumCpmmForwardConfig({
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      ammConfig: AMM_CONFIG,
      unwrapNativeSol: true,
    });
    expect(cfg.forwardFlags).toBe(1);
    expect(cfg.outputMint.equals(OUTPUT_MINT)).toBe(true);
  });
});
