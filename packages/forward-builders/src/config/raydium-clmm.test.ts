/**
 * Pure unit tests for the browser-safe `raydiumClmmForwardConfig` constraint
 * builder. Lives next to src/config/raydium-clmm.ts and imports it directly —
 * proving the config module is venue-SDK-free (no @raydium-io mock needed).
 * See TRIBUTARY-WASM-FIX.md.
 */
import { PublicKey } from "@solana/web3.js";
import {
  raydiumClmmForwardConfig,
  RAYDIUM_CLMM_SWAP_V2_DISCRIMINATOR,
} from "./raydium-clmm";
import { RAYDIUM_CLMM_PUBKEY } from "../constants";

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

describe("raydiumClmmForwardConfig", () => {
  test("pins programId = CLMM, pool + ammConfig, and mints", () => {
    const cfg = raydiumClmmForwardConfig({
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      ammConfig: AMM_CONFIG,
    });
    expect(
      cfg.instructionConstraint.programId.equals(RAYDIUM_CLMM_PUBKEY)
    ).toBe(true);
    expect(cfg.instructionConstraint.numPinnedAccounts).toBe(2);
    expect(
      cfg.instructionConstraint.pinnedAccounts[0]!.pubkey.equals(POOL)
    ).toBe(true);
    expect(
      cfg.instructionConstraint.pinnedAccounts[1]!.pubkey.equals(AMM_CONFIG)
    ).toBe(true);
    expect(cfg.forwardFlags).toBe(0);
  });

  test("pins the swap_v2 discriminator at dataChecks[0]", () => {
    const cfg = raydiumClmmForwardConfig({
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      ammConfig: AMM_CONFIG,
    });
    const check = cfg.instructionConstraint.dataChecks[0]!;
    expect(check.offset).toBe(0);
    expect(check.length).toBe(8);
    expect(Array.from(check.expected)).toEqual([
      ...RAYDIUM_CLMM_SWAP_V2_DISCRIMINATOR,
    ]);
  });
});
