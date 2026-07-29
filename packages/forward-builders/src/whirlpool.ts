import {
  setNativeMintWrappingStrategy,
  swapInstructions,
} from "@orca-so/whirlpools";
import {
  address,
  createNoopSigner,
  createSolanaRpc,
  isWritableRole,
} from "@solana/kit";
import { type Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import type {
  ComposablePolicy,
  ForwardBuilder,
  ForwardConfig,
} from "@tributary-so/sdk";
import { WHIRLPOOL_PUBKEY } from "./constants";
export {
  whirlpoolForwardConfig,
  WHIRLPOOL_SWAP_V2_DISCRIMINATOR,
  type WhirlpoolForwardConfigOptions,
} from "./config/whirlpool";

const WHIRLPOOL_PROGRAM_ADDRESS = address(
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"
);

/**
 * Options for {@link createWhirlpoolForward}.
 */
export interface WhirlpoolForwardOptions {
  /** The Orca Whirlpool (concentrated-liquidity pool) to swap through. */
  pool: PublicKey;
  /** Slippage tolerance in basis points (e.g. 100 = 1%). */
  slippageBps: number;
}

/**
 * Build an Orca Whirlpool `swap_v2` as a Tributary composable forward step.
 *
 * Uses the Orca `@orca-so/whirlpools` SDK (kit v2) **internally**: a kit RPC
 * is constructed from the v1 Connection endpoint, a noop signer is created
 * for the composable policy PDA, and the SDK's `swapInstructions()` resolves
 * tick arrays + oracle + quote. Only the whirlpool swap instruction is
 * extracted — ATA-create/wrap/cleanup ixs are dropped (Tributary owns the
 * intermediate ATA lifecycle).
 *
 * Kit types are converted back to web3.js v1 types at the boundary; they do
 * not leak into the public API.
 *
 * Returns a {@link ForwardBuilder} whose `build()` returns:
 *
 * - `instructionData` — raw swap_v2 selector + args.
 * - `forwardAccounts` — per-account `{ pubkey, isWritable }`. **No
 *   `isSigner`** (ADR-0008).
 */
export function createWhirlpoolForward(
  opts: WhirlpoolForwardOptions
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
      // ── kit v2 interop ────────────────────────────────────────────
      // Build a kit RPC from the v1 Connection endpoint. The Orca SDK
      // needs kit v2 types internally.
      setNativeMintWrappingStrategy("ata");

      const rpc = createSolanaRpc(connection.rpcEndpoint);
      const signer = createNoopSigner(address(composablePolicyPda.toBase58()));

      const inputMint = policy.forwardConfig.inputMint;
      const { instructions } = await swapInstructions(
        rpc,
        {
          inputAmount: BigInt(face.toString()),
          mint: address(inputMint.toBase58()),
        },
        address(opts.pool.toBase58()),
        {
          slippageToleranceBps: opts.slippageBps,
          signer,
        }
      );

      // Extract ONLY the whirlpool swap instruction — drop ATA-create /
      // wrap / cleanup ixs (Tributary owns the intermediate lifecycle).
      const swapIx = instructions.find(
        (ix) => ix.programAddress === WHIRLPOOL_PROGRAM_ADDRESS
      );
      if (!swapIx || !swapIx.accounts || !swapIx.data) {
        throw new Error(
          "Whirlpool swap_v2 instruction not found in swapInstructions() output"
        );
      }

      // ── convert kit metas → ForwardAccountMeta ────────────────────
      return {
        instructionData: Buffer.from(swapIx.data),
        forwardAccounts: swapIx.accounts.map((meta) => ({
          pubkey: new PublicKey(meta.address),
          isWritable: isWritableRole(meta.role),
        })),
      };
    },
  };
}

