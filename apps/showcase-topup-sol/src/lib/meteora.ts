import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import type { Connection } from "@solana/web3.js";
import BN from "bn.js";
import DLMM from "@meteora-ag/dlmm";
import { METEORA_DLMM_PUBKEY } from "./pools";

export interface SwapQuote {
  /** First 8 bytes of the DLMM swap ix data — pins ForwardConfig.data_checks[0]. */
  discriminator: number[];
  /** Minimum output amount from the quote (post-slippage). */
  minOutAmount: BN;
}

/**
 * Load a Meteora DLMM pool, quote a swap, and return the swap instruction's
 * 8-byte discriminator. The discriminator is stored in the ComposablePolicy's
 * ForwardConfig.data_checks so the on-chain forward step can only ever invoke
 * this exact instruction selector (prevents a gateway swapping in an arbitrary
 * ix).
 *
 * Mirrors buildSwapIx() in tests/topup-balance-sol.test.ts, including the
 * hostFeeIn rewrite (System Program → DLMM program id) workaround. Only the
 * data + minOutAmount are returned — the keys are rebuilt at execute time by
 * whoever runs the policy.
 *
 * NOTE: `user` is the ComposablePolicy PDA at execute time, but it only
 * affects the ix keys (signer/writable), not the data/discriminator, so the
 * caller need not know it here.
 */
export async function buildSwapQuote(
  connection: Connection,
  poolAddress: PublicKey,
  inMint: PublicKey,
  outMint: PublicKey,
  inAmount: BN,
  slippageBps: number = 100 // 1% default
): Promise<SwapQuote> {
  const pool = await DLMM.create(connection, poolAddress, {
    cluster: "mainnet-beta",
    skipSolWrappingOperation: true,
  });

  const swapForY = inMint.equals(pool.tokenX.publicKey);
  const binArrays = await pool.getBinArrayForSwap(swapForY);
  const quote = pool.swapQuote(
    inAmount,
    swapForY,
    new BN(slippageBps),
    binArrays
  );

  // Build the actual swap ix to read its discriminator. The user pubkey here
  // is irrelevant for the data — pass the pool owner as a placeholder.
  const swapTx = await pool.swap({
    lbPair: poolAddress,
    inToken: inMint,
    outToken: outMint,
    inAmount,
    minOutAmount: quote.minOutAmount,
    user: poolAddress,
    binArraysPubkey: quote.binArraysPubkey as PublicKey[],
  });

  const ix = swapTx.instructions.find((i) =>
    i.programId.equals(METEORA_DLMM_PUBKEY)
  );
  if (!ix) {
    throw new Error("DLMM swap instruction not found in pool.swap() output");
  }

  return {
    discriminator: Array.from(ix.data.slice(0, 8)),
    minOutAmount: quote.minOutAmount,
  };
}

/**
 * Apply the hostFeeIn workaround to a forward-accounts list: rewrite any
 * SystemProgram entry to the DLMM program id. Matches the test's rewrite and
 * is needed at execute time (kept here so execute logic stays colocated).
 */
export function rewriteHostFeeIn(
  ix: TransactionInstruction
): TransactionInstruction {
  const keys = ix.keys.map((k) =>
    k.pubkey.equals(SystemProgram.programId)
      ? {
          pubkey: METEORA_DLMM_PUBKEY,
          isSigner: k.isSigner,
          isWritable: k.isWritable,
        }
      : k
  );
  return new TransactionInstruction({
    keys,
    programId: ix.programId,
    data: ix.data,
  });
}
