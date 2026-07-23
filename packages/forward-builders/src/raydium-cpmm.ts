import {
  makeSwapCpmmBaseInInstruction,
  getPdaPoolAuthority,
  getPdaVault,
  getPdaObservationId,
} from "@raydium-io/raydium-sdk-v2";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { type Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import type {
  ComposablePolicy,
  ForwardBuilder,
  ForwardConfig,
} from "@tributary-so/sdk";
import { RAYDIUM_CPMM_PUBKEY } from "./constants";

/**
 * Options for {@link createRaydiumCpmmForward}.
 */
export interface RaydiumCpmmForwardOptions {
  /** The CPMM constant-product pool to swap through (PDA, pinned on-chain). */
  pool: PublicKey;
  /** The CPMM amm-config account — locks the fee tier (PDA, pinned on-chain). */
  ammConfig: PublicKey;
  /** Slippage tolerance in basis points (e.g. 100 = 1%). */
  slippageBps: number;
  /**
   * Override the computed minimum-out. When omitted, the builder uses the
   * bps-floor default: `floor(face * (10000 - slippageBps) / 10000)`.
   * Supply your own for exact-quote strategies (requires an RPC reserve
   * read — left to the caller to keep `build()` RPC-light).
   */
  minimumAmountOut?: BN;
}

/**
 * Build a Raydium CPMM `swap_base_input` as a Tributary composable forward
 * step.
 *
 * CPMM is a constant-product AMM (x*y=k): the `swap_base_input` instruction
 * takes a known `amount_in` + `minimum_amount_out`, matching Tributary's
 * known-`face` forward model (we pull a fixed amount, not a target output).
 *
 * Account layout (13 fixed, no DLMM-style dynamic bin arrays):
 *
 * | idx | account            | source                                 |
 * |-----|--------------------|----------------------------------------|
 * | 0   | payer              | composablePolicyPda (CPI signer)       |
 * | 1   | authority          | getPdaPoolAuthority(programId)         |
 * | 2   | amm_config         | opts.ammConfig (fee tier)              |
 * | 3   | pool_state         | opts.pool                              |
 * | 4   | input_user_account | ATA(composablePolicyPda, inputMint)    |
 * | 5   | output_user_account| ATA(composablePolicyPda, outputMint)   |
 * | 6   | input_vault        | getPdaVault(programId, pool, inputMint)|
 * | 7   | output_vault       | getPdaVault(programId, pool, outputMint)|
 * | 8   | input_token_program| TOKEN_PROGRAM_ID                       |
 * | 9   | output_token_program| TOKEN_PROGRAM_ID                      |
 * | 10  | input_token_mint   | policy.forwardConfig.inputMint         |
 * | 11  | output_token_mint  | policy.forwardConfig.outputMint        |
 * | 12  | observation_state  | getPdaObservationId(programId, pool)   |
 *
 * All 13 accounts are pure PDA/ATA derivations — zero RPC calls in
 * `build()`. Unlike the Meteora builder, there is no host-fee SystemProgram
 * quirk to patch.
 *
 * Returns a {@link ForwardBuilder} whose `build()` returns:
 *
 * - `instructionData` — raw `swap_base_input` selector (8 B) + amount_in (8
 *   B) + minimum_amount_out (8 B) = 24 bytes.
 * - `forwardAccounts` — per-account `{ pubkey, isWritable }` from the swap
 *   instruction's account list. **No `isSigner` field** (ADR-0008).
 */
export function createRaydiumCpmmForward(
  opts: RaydiumCpmmForwardOptions
): ForwardBuilder {
  return {
    async build({
      policy,
      composablePolicyPda,
      face,
    }: {
      connection: Connection;
      policy: ComposablePolicy;
      composablePolicyPda: PublicKey;
      face: BN;
    }) {
      const inputMint = policy.forwardConfig.inputMint;
      const outputMint = policy.forwardConfig.outputMint;

      const authority = getPdaPoolAuthority(RAYDIUM_CPMM_PUBKEY).publicKey;
      const inputVault = getPdaVault(
        RAYDIUM_CPMM_PUBKEY,
        opts.pool,
        inputMint
      ).publicKey;
      const outputVault = getPdaVault(
        RAYDIUM_CPMM_PUBKEY,
        opts.pool,
        outputMint
      ).publicKey;
      const observationId = getPdaObservationId(
        RAYDIUM_CPMM_PUBKEY,
        opts.pool
      ).publicKey;

      const userInputAccount = getAssociatedTokenAddressSync(
        inputMint,
        composablePolicyPda
      );
      const userOutputAccount = getAssociatedTokenAddressSync(
        outputMint,
        composablePolicyPda
      );

      const minOut =
        opts.minimumAmountOut ??
        face.muln(10_000 - opts.slippageBps).divn(10_000);

      const swapIx = makeSwapCpmmBaseInInstruction(
        RAYDIUM_CPMM_PUBKEY,
        composablePolicyPda,
        authority,
        opts.ammConfig,
        opts.pool,
        userInputAccount,
        userOutputAccount,
        inputVault,
        outputVault,
        TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        inputMint,
        outputMint,
        observationId,
        face,
        minOut
      );

      return {
        instructionData: Buffer.from(swapIx.data),
        forwardAccounts: swapIx.keys.map((k) => ({
          pubkey: k.pubkey,
          isWritable: k.isWritable,
        })),
      };
    },
  };
}

// ── Setup-time: ForwardConfig constraint ──────────────────────
// The fire-time {@link createRaydiumCpmmForward} above and the setup-time
// constraint below are two views of the same CPMM swap. Co-locating them
// here makes setup/fire-time drift impossible: the programId, the pinned
// pool + amm_config, and the swap selector the builder emits are exactly
// the fields the constraint pins on-chain. See Tributary ADR-0030.

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
 * half of the pair whose fire half is {@link createRaydiumCpmmForward}; the
 * two are co-located here so they cannot drift apart.
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
