import { Connection } from "@solana/web3.js";

/**
 * Read the on-chain clock so test timestamps derive from the same source
 * the program uses (Clock::get().unix_timestamp), avoiding drift between
 * the test runner's wall clock and the validator's clock.
 *
 * Some clusters (notably Surfpool) don't expose block times via
 * `getBlockTime` (it returns null). In that case we fall back to the local
 * wall clock rather than failing — composable tests only need a timestamp
 * that's roughly aligned with the chain, not exact.
 */
export async function getOnChainNow(connection: Connection): Promise<number> {
  try {
    const slot = await connection.getSlot();
    const blockTime = await connection.getBlockTime(slot);
    if (blockTime !== null) return blockTime;
  } catch {
    // fall through to wall-clock
  }
  return Math.floor(Date.now() / 1000);
}
