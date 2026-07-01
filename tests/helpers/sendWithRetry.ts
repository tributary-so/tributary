import {
  Connection,
  Transaction,
  sendAndConfirmTransaction,
  Commitment,
  Keypair,
  TransactionExpiredBlockheightExceededError,
} from "@solana/web3.js";

/**
 * Wraps `sendAndConfirmTransaction` with automatic retry on
 * `TransactionExpiredBlockheightExceededError`.
 *
 * On CI (2-core runners), Surfpool can stall long enough for a blockhash to
 * expire (~150 blocks ≈ 60s). This helper catches the expiry, re-fetches a
 * fresh blockhash, re-signs, and re-submits — recovering instantly instead
 * of burning the full 60s window as a test failure.
 *
 * Non-expiry errors (program logic failures, signature errors, etc.) are
 * re-thrown immediately without retry.
 *
 * @param maxRetries — how many times to retry on blockhash expiry (default 3)
 */
export async function sendAndConfirmWithRetry(
  connection: Connection,
  tx: Transaction,
  signers: Keypair[],
  opts?: { commitment?: Commitment; maxRetries?: number }
): Promise<string> {
  const maxRetries = opts?.maxRetries ?? 3;
  const commitment = opts?.commitment ?? ("processed" as Commitment);

  // Preserve the original instructions; we rebuild the Transaction object
  // on each retry so the new blockhash is clean.
  const instructions = tx.instructions;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const freshTx = new Transaction().add(...instructions);
      return await sendAndConfirmTransaction(connection, freshTx, signers, {
        commitment,
      });
    } catch (err: unknown) {
      lastError = err;
      // Only retry on blockhash expiry — everything else is a real failure.
      if (
        err instanceof TransactionExpiredBlockheightExceededError ||
        (err instanceof Error &&
          err.name === "TransactionExpiredBlockheightExceededError")
      ) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
