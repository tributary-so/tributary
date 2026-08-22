import type { Connection, PublicKey } from "@solana/web3.js";
import { getTokenSymbol as gts } from "@tributary-so/sdk";

export async function getTokenSymbol(connection: Connection, mintAddress: string | PublicKey) {
  if (mintAddress == "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU") {
    return "USDC (devnet)";
  }
  return gts(connection, mintAddress);
}

export const rawToHuman = (raw: string, decimals = 6): number => {
  const n = parseInt(raw, 10);
  if (isNaN(n)) return 0;
  return n / Math.pow(10, decimals);
};
