import DLMM from "@meteora-ag/dlmm";
import { PublicKey, SystemProgram, type Connection } from "@solana/web3.js";
import BN from "bn.js";
import type {
  ComposablePolicy,
  ForwardBuilder,
  ForwardConfig,
} from "@tributary-so/sdk";
import { METEORA_DLMM_PUBKEY } from "./constants";

/**
 * Options for {@link createMeteoraDlmmForward}.
 */
export interface MeteoraDlmmForwardOptions {
  /** The DLMM liquidity-bin pool to swap through. */
  pool: PublicKey;
  /** Slippage tolerance in basis points (e.g. 100 = 1%). */
  slippageBps: number;
  /**
   * Rewrite the host-fee-in account from SystemProgram back to the DLMM
   * program id. Meteora declares the host-fee input as SystemProgram, which
   * silently disables the host-fee path. Enable this when the gateway is a
   * DLMM fee-host. Off by default.
   */
  applyHostFeeInFix?: boolean;
}

/**
 * Build a Meteora DLMM swap as a Tributary composable forward step.
 *
 * Returns a {@link ForwardBuilder} whose `build()` resolves the swap quote,
 * constructs the DLMM swap instruction, and returns it in the shape
 * `execute_composable` consumes:
 *
 * - `instructionData` — raw DLMM swap selector + args.
 * - `forwardAccounts` — per-account `{ pubkey, isWritable }` taken verbatim
 *   from the swap instruction's account list. **No `isSigner` field** — the
 *   SDK assembler stamps `isSigner: false` on every forward account,
 *   enforcing ADR-0008 (CPI signer sanitization).
 *
 * The builder receives `face` (the amount the forward consumes); the caller
 * resolves it via `resolveDefaultForwardAmount` or a manual override.
 */
export function createMeteoraDlmmForward(
  opts: MeteoraDlmmForwardOptions
): ForwardBuilder {
  return {
    async build({
      connection,
      policy,
      composablePolicyPda,
      face,
    }: {
      connection: Connection;
      policy: ComposablePolicy;
      composablePolicyPda: PublicKey;
      face: BN;
    }) {
      const dlmmPool = await DLMM.create(connection, opts.pool, {
        cluster: "mainnet-beta",
        skipSolWrappingOperation: true,
      });

      const inputMint = policy.forwardConfig.inputMint;
      const outputMint = policy.forwardConfig.outputMint;
      const swapForY = inputMint.equals(dlmmPool.tokenX.publicKey);
      const binArrays = await dlmmPool.getBinArrayForSwap(swapForY);
      const quote = dlmmPool.swapQuote(
        face,
        swapForY,
        new BN(opts.slippageBps),
        binArrays
      );

      const swapTx = await dlmmPool.swap({
        lbPair: opts.pool,
        inToken: inputMint,
        outToken: outputMint,
        inAmount: face,
        minOutAmount: quote.minOutAmount,
        user: composablePolicyPda,
        binArraysPubkey: quote.binArraysPubkey as PublicKey[],
      });

      const swapIx = swapTx.instructions.find((i) =>
        i.programId.equals(METEORA_DLMM_PUBKEY)
      );
      if (!swapIx) {
        throw new Error(
          "DLMM swap instruction not found in pool.swap() output"
        );
      }

      let keys = swapIx.keys;
      if (opts.applyHostFeeInFix) {
        keys = keys.map((k) =>
          k.pubkey.equals(SystemProgram.programId)
            ? { ...k, pubkey: METEORA_DLMM_PUBKEY }
            : k
        );
      }

      return {
        instructionData: Buffer.from(swapIx.data),
        forwardAccounts: keys.map((k) => ({
          pubkey: k.pubkey,
          isWritable: k.isWritable,
        })),
      };
    },
  };
}

// ── Setup-time: ForwardConfig constraint ──────────────────────
// The fire-time {@link createMeteoraDlmmForward} above and the setup-time
// constraint below are two views of the same DLMM swap. Co-locating them
// here makes setup/fire-time drift impossible: the programId, the pinned
// pool, and the swap selector the builder emits are exactly the fields the
// constraint pins on-chain. See Tributary ADR-0030.

/**
 * Anchor discriminator for Meteora DLMM's `swap` instruction — the first 8
 * bytes of `sha256("global:swap")`. Sourced from @meteora-ag/dlmm's published
 * IDL (ix name "swap"). Tributary's `create_composable_policy` requires any
 * forward-enabled `InstructionConstraint` to carry at least one `ByteRangeCheck`
 * covering offset 0 (`DiscriminatorCheckRequired`); pinning the swap selector
 * there closes the boundary so the gateway signer can't substitute a different
 * DLMM instruction (e.g. initialize/withdraw) at execute time.
 */
export const METEORA_DLMM_SWAP_DISCRIMINATOR = [
  248, 198, 158, 145, 225, 117, 135, 200,
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
 * {@link createMeteoraDlmmForward}; the two are co-located here so they cannot
 * drift apart.
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
