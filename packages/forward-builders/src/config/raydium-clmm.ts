// Browser-safe setup-time surface for Raydium CLMM composable forwards.
//
// This module MUST NOT import any venue SDK (@meteora-ag/dlmm,
// @raydium-io/raydium-sdk-v2, @orca-so/whirlpools, @solana/kit). The pure
// constraint builder needs only PublicKey + the discriminator + the
// ForwardConfig type, so the browser subpath (@tributary-so/forward-builders/config)
// can re-export it without dragging venue-SDK wasm into a Vite browser build.
// The fire-time half (createRaydiumClmmForward) stays on the main entry. See
// Tributary ADR-0030 and TRIBUTARY-WASM-FIX.md.
import { PublicKey } from "@solana/web3.js";
import type { ForwardConfig } from "@tributary-so/sdk";
import { RAYDIUM_CLMM_PUBKEY } from "../constants";

/**
 * Anchor discriminator for Raydium CLMM's `swap_v2` instruction —
 * the first 8 bytes of `sha256("global:swap_v2")`.
 */
export const RAYDIUM_CLMM_SWAP_V2_DISCRIMINATOR = [
  43, 4, 237, 11, 26, 201, 30, 98,
] as const;

/**
 * Options for {@link raydiumClmmForwardConfig}.
 */
export interface RaydiumClmmForwardConfigOptions {
  inputMint: PublicKey;
  outputMint: PublicKey;
  /** The CLMM pool to swap through. Pinned at `pinnedAccounts[0]` (index 2). */
  pool: PublicKey;
  /** The CLMM amm-config (fee tier). Pinned at `pinnedAccounts[1]` (index 1). */
  ammConfig: PublicKey;
  unwrapNativeSol?: boolean;
}

/**
 * Build the setup-time `ForwardConfig` that constrains a CLMM-swap composable
 * policy. Pins `programId = RAYDIUM_CLMM_PUBKEY`, two `pinnedAccounts`
 * (poolId at index 2 + ammConfig at index 1), and `dataChecks[0]` = the
 * swap_v2 discriminator.
 */
export function raydiumClmmForwardConfig(
  opts: RaydiumClmmForwardConfigOptions
): ForwardConfig {
  const emptyByteRangeCheck = {
    offset: 0,
    length: 0,
    expected: new Array(8).fill(0),
  };
  return {
    instructionConstraint: {
      programId: RAYDIUM_CLMM_PUBKEY,
      numDataChecks: 1,
      dataChecks: [
        {
          offset: 0,
          length: 8,
          expected: [...RAYDIUM_CLMM_SWAP_V2_DISCRIMINATOR],
        },
        emptyByteRangeCheck,
        emptyByteRangeCheck,
        emptyByteRangeCheck,
      ],
      numPinnedAccounts: 2,
      pinnedAccounts: [
        { index: 2, pubkey: opts.pool },
        { index: 1, pubkey: opts.ammConfig },
      ],
    },
    inputMint: opts.inputMint,
    outputMint: opts.outputMint,
    forwardFlags: opts.unwrapNativeSol ? 1 : 0,
  };
}
