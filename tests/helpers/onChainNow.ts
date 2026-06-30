import { Connection } from "@solana/web3.js";

/**
 * Read the on-chain clock so test timestamps derive from the same source
 * the program uses (Clock::get().unix_timestamp), avoiding drift between
 * the test runner's wall clock and the validator's clock.
 *
 * Falls back to throwing if block time cannot be fetched, which surfaces
 * connection/cluster issues clearly instead of producing flaky timestamps.
 */
export async function getOnChainNow(connection: Connection): Promise<number> {
  const slot = await connection.getSlot();
  const blockTime = await connection.getBlockTime(slot);
  if (blockTime === null) {
    throw new Error(
      `Could not fetch block time for slot ${slot} — is the cluster reachable?`
    );
  }
  return blockTime;
}
