/**
 * Solana Connection Service
 * Manages Solana RPC connections and token operations
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";

const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";

/**
 * Get or create a Solana connection
 * @returns Solana Connection instance
 */
export function getConnection(): Connection {
  return new Connection(SOLANA_RPC);
}

/**
 * Fetch mint info from Solana and extract decimals
 * @param tokenMint - Token mint address
 * @returns Number of decimals for this token
 */
export async function getMintDecimals(tokenMint: string): Promise<number> {
  try {
    const connection = getConnection();
    const mintPublicKey = new PublicKey(tokenMint);
    const mintAccount = await getMint(connection, mintPublicKey);
    return mintAccount.decimals;
  } catch (error) {
    console.error(`Failed to fetch mint info for ${tokenMint}:`, error);
    // Default to 6 decimals (USDC standard) on error
    return 6;
  }
}

/**
 * Convert float amount to integer based on token decimals
 * @param amount - Float amount (e.g., 10.5 for 10.5 tokens)
 * @param decimals - Number of decimals for the token
 * @returns Integer amount in smallest units (e.g., 10500000 for 10.5 USDC)
 */
export function convertAmountToInteger(amount: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.floor(amount * factor);
}

/**
 * Convert integer amount to float based on token decimals
 * @param amount - Integer amount in smallest units
 * @param decimals - Number of decimals for the token
 * @returns Float amount for display
 */
export function convertAmountToFloat(amount: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return amount / factor;
}
