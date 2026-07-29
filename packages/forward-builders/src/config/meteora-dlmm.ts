// Browser-safe setup-time surface for Meteora DLMM composable forwards.
//
// This module MUST NOT import any venue SDK (@meteora-ag/dlmm,
// @raydium-io/raydium-sdk-v2, @orca-so/whirlpools, @solana/kit). The pure
// constraint builder needs only PublicKey + the discriminator + the
// ForwardConfig type, so the browser subpath (@tributary-so/forward-builders/config)
// can re-export it without dragging venue-SDK wasm into a Vite browser build.
// The fire-time half (createMeteoraDlmmForward) stays on the main entry. See
// Tributary ADR-0030 and TRIBUTARY-WASM-FIX.md.
import { PublicKey } from "@solana/web3.js";
import type { ForwardConfig } from "@tributary-so/sdk";
import { METEORA_DLMM_PUBKEY } from "../constants";

/**
 * Anchor discriminator for Meteora DLMM's `swap2` instruction — the first 8
 * bytes of `sha256("global:swap2")`. Sourced from @meteora-ag/dlmm's published
 * IDL (ix name "swap2"). Tributary's `create_composable_policy` requires any
 * forward-enabled `InstructionConstraint` to carry at least one `ByteRangeCheck`
 * covering offset 0 (`DiscriminatorCheckRequired`); pinning the swap selector
 * there closes the boundary so the gateway signer can't substitute a different
 * DLMM instruction (e.g. initialize/withdraw) at execute time.
 */
export const METEORA_DLMM_SWAP_DISCRIMINATOR = [
  65, 75, 63, 76, 235, 91, 91, 136,
] as const;

/**
 * Options for {@link meteoraDlmmForwardConfig}.
 */
export interface MeteoraDlmmForwardConfigOptions {
  /** Input mint of the swap (debited from the user's delegate). */
  inputMint: PublicKey;
  /** Output mint of the swap (credited to the recipient). */
  outputMint: PublicKey;
  /**
   * The DLMM liquidity-bin pool to swap through. Pinned at
   * `pinnedAccounts[0]` so the reviewed pool is the only one the scheduler
   * may route through.
   */
  pool: PublicKey;
  /**
   * Sets bit 0 of `forward_flags` (`FORWARD_FLAG_NATIVE_OUTPUT`), which makes
   * Tributary unwrap WSOL → native SOL via a closeAccount sweep at settle.
   * Requires `outputMint == NATIVE_MINT`; see `composable_policy.rs`.
   * Off by default.
   */
  unwrapNativeSol?: boolean;
}

/**
 * Build the setup-time `ForwardConfig` that constrains a DLMM-swap composable
 * policy.
 *
 * Pins `programId = METEORA_DLMM_PUBKEY`, `pinnedAccounts[0] = pool`, and
 * `dataChecks[0]` = the swap-ix discriminator — the on-chain constraint then
 * enforces "swap through the reviewed pool with the reviewed selector". This
 * is the constraint half of the pair whose fire half is
 * {@link createMeteoraDlmmForward} (main entry); the two are split across the
 * config / main entries so they cannot drift apart.
 *
 * https://github.com/MeteoraAg/dlmm-sdk/blob/main/idls/dlmm.json#L4090
 */
export function meteoraDlmmForwardConfig(
  opts: MeteoraDlmmForwardConfigOptions
): ForwardConfig {
  const emptyByteRangeCheck = {
    offset: 0,
    length: 0,
    expected: new Array(8).fill(0),
  };
  return {
    instructionConstraint: {
      programId: METEORA_DLMM_PUBKEY,
      numDataChecks: 1,
      dataChecks: [
        {
          offset: 0,
          length: 8,
          expected: [...METEORA_DLMM_SWAP_DISCRIMINATOR],
        },
        emptyByteRangeCheck,
        emptyByteRangeCheck,
        emptyByteRangeCheck,
      ],
      numPinnedAccounts: 1,
      pinnedAccounts: [
        { index: 0, pubkey: opts.pool },
        { index: 0, pubkey: PublicKey.default },
        { index: 0, pubkey: PublicKey.default },
        { index: 0, pubkey: PublicKey.default },
      ],
    },
    inputMint: opts.inputMint,
    outputMint: opts.outputMint,
    forwardFlags: opts.unwrapNativeSol ? 1 : 0,
  };
}
