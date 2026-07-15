import DLMM from "@meteora-ag/dlmm";
import { PublicKey, SystemProgram, type Connection } from "@solana/web3.js";
import BN from "bn.js";
import type { ComposablePolicy, ForwardBuilder } from "@tributary-so/sdk";
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
