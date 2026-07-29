/**
 * Pure unit tests for the browser-safe `meteoraDlmmForwardConfig` constraint
 * builder. Lives next to src/config/meteora-dlmm.ts and imports it directly —
 * proving the config module is venue-SDK-free (no @meteora-ag/dlmm mock needed).
 * See TRIBUTARY-WASM-FIX.md.
 */
import { PublicKey } from "@solana/web3.js";
import {
  meteoraDlmmForwardConfig,
  METEORA_DLMM_SWAP_DISCRIMINATOR,
} from "./meteora-dlmm";
import { METEORA_DLMM_PUBKEY } from "../constants";

const POOL = new PublicKey("BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y");
const INPUT_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
); // USDC
const OUTPUT_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
); // WSOL

describe("meteoraDlmmForwardConfig", () => {
  test("pins programId = METEORA_DLMM, pool at pinnedAccounts[0], and mints", () => {
    const cfg = meteoraDlmmForwardConfig({
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
    });
    expect(
      cfg.instructionConstraint.programId.equals(METEORA_DLMM_PUBKEY)
    ).toBe(true);
    expect(cfg.instructionConstraint.numPinnedAccounts).toBe(1);
    expect(
      cfg.instructionConstraint.pinnedAccounts[0]!.pubkey.equals(POOL)
    ).toBe(true);
    expect(
      cfg.inputMint.equals(INPUT_MINT) && cfg.outputMint.equals(OUTPUT_MINT)
    ).toBe(true);
    // forwardFlags default = 0 (no WSOL unwrap).
    expect(cfg.forwardFlags).toBe(0);
  });

  test("pins the swap discriminator at dataChecks[0] (offset 0, length 8)", () => {
    const cfg = meteoraDlmmForwardConfig({
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
    });
    // On-chain requires num_data_checks >= 1.
    expect(cfg.instructionConstraint.numDataChecks).toBe(1);
    const check = cfg.instructionConstraint.dataChecks[0]!;
    expect(check.offset).toBe(0);
    expect(check.length).toBe(8);
    expect(Array.from(check.expected)).toEqual([
      ...METEORA_DLMM_SWAP_DISCRIMINATOR,
    ]);
    // Trailing slots remain the empty sentinel.
    for (let i = 1; i < 4; i++) {
      expect(cfg.instructionConstraint.dataChecks[i]!.length).toBe(0);
    }
  });

  test("sets FORWARD_FLAG_NATIVE_OUTPUT (bit 0) when unwrapNativeSol=true", () => {
    const cfg = meteoraDlmmForwardConfig({
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      pool: POOL,
      unwrapNativeSol: true,
    });
    expect(cfg.forwardFlags).toBe(1);
    expect(cfg.outputMint.equals(OUTPUT_MINT)).toBe(true);
  });
});
