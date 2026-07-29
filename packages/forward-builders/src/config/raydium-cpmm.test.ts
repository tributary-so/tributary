/**
 * Pure unit tests for the browser-safe `raydiumCpmmForwardConfig` constraint
 * builder. Lives next to src/config/raydium-cpmm.ts and imports it directly —
 * proving the config module is venue-SDK-free (no @raydium-io mock needed).
 * See TRIBUTARY-WASM-FIX.md.
 */
import { PublicKey } from "@solana/web3.js";
import {
  raydiumCpmmForwardConfig,
  RAYDIUM_CPMM_SWAP_BASE_INPUT_DISCRIMINATOR,
} from "./raydium-cpmm";
import { RAYDIUM_CPMM_PUBKEY } from "../constants";

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
