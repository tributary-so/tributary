// Browser-safe setup-time surface for Raydium CPMM composable forwards.
//
// This module MUST NOT import any venue SDK (@meteora-ag/dlmm,
// @raydium-io/raydium-sdk-v2, @orca-so/whirlpools, @solana/kit). The pure
// constraint builder needs only PublicKey + the discriminator + the
// ForwardConfig type, so the browser subpath (@tributary-so/forward-builders/config)
// can re-export it without dragging venue-SDK wasm into a Vite browser build.
// The fire-time half (createRaydiumCpmmForward) stays on the main entry. See
// Tributary ADR-0030 and TRIBUTARY-WASM-FIX.md.
import { PublicKey } from "@solana/web3.js";
import type { ForwardConfig } from "@tributary-so/sdk";
import { RAYDIUM_CPMM_PUBKEY } from "../constants";

/**
 * Anchor discriminator for Raydium CPMM's `swap_base_input` instruction —
 * the first 8 bytes of `sha256("global:swap_base_input")`. Tributary's
 * `create_composable_policy` requires any forward-enabled
 * `InstructionConstraint` to carry at least one `ByteRangeCheck` covering
 * offset 0 (`DiscriminatorCheckRequired`); pinning the swap selector there
 * closes the boundary so the gateway signer can't substitute a different
 * CPMM instruction (e.g. deposit/withdraw/initialize) at execute time.
 */
export const RAYDIUM_CPMM_SWAP_BASE_INPUT_DISCRIMINATOR = [
  143, 190, 90, 218, 196, 30, 51, 222,
] as const;

/**
 * Options for {@link raydiumCpmmForwardConfig}.
 */
export interface RaydiumCpmmForwardConfigOptions {
  /** Input mint of the swap (debited from the user's delegate). */
  inputMint: PublicKey;
  /** Output mint of the swap (credited to the recipient). */
  outputMint: PublicKey;
  /** The CPMM pool to swap through. Pinned at `pinnedAccounts[0]` (index 3). */
  pool: PublicKey;
  /**
   * The CPMM amm-config (fee tier). Pinned at `pinnedAccounts[1]` (index 2).
   * The same token pair can be re-initialized under different configs, so
   * locking the config prevents routing through a higher-fee twin pool.
   */
  ammConfig: PublicKey;
  /**
   * Sets bit 0 of `forward_flags` (`FORWARD_FLAG_NATIVE_OUTPUT`), which makes
   * Tributary unwrap WSOL → native SOL via a closeAccount sweep at settle.
   * Requires `outputMint == NATIVE_MINT`; see `composable_policy.rs`.
   * Off by default.
   */
  unwrapNativeSol?: boolean;
}

/**
 * Build the setup-time `ForwardConfig` that constrains a CPMM-swap composable
 * policy.
 *
 * Pins `programId = RAYDIUM_CPMM_PUBKEY`, two `pinnedAccounts` (pool_state at
 * index 3 + amm_config at index 2), and `dataChecks[0]` = the swap-ix
 * discriminator — the on-chain constraint then enforces "swap through the
 * reviewed pool + config with the reviewed selector". This is the constraint
 * half of the pair whose fire half is {@link createRaydiumCpmmForward} (main
 * entry); the two are split across the config / main entries so they cannot
 * drift apart.
 */
export function raydiumCpmmForwardConfig(
  opts: RaydiumCpmmForwardConfigOptions
): ForwardConfig {
  const emptyByteRangeCheck = {
    offset: 0,
    length: 0,
    expected: new Array(8).fill(0),
  };
  return {
    instructionConstraint: {
      programId: RAYDIUM_CPMM_PUBKEY,
      numDataChecks: 1,
      dataChecks: [
        {
          offset: 0,
          length: 8,
          expected: [...RAYDIUM_CPMM_SWAP_BASE_INPUT_DISCRIMINATOR],
        },
        emptyByteRangeCheck,
        emptyByteRangeCheck,
        emptyByteRangeCheck,
      ],
      numPinnedAccounts: 2,
      pinnedAccounts: [
        { index: 3, pubkey: opts.pool },
        { index: 2, pubkey: opts.ammConfig },
      ],
    },
    inputMint: opts.inputMint,
    outputMint: opts.outputMint,
    forwardFlags: opts.unwrapNativeSol ? 1 : 0,
  };
}
