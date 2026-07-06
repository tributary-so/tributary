/**
 * MINT_OVERRIDES — single source of truth.
 *
 * Used as:
 *   1. The static seed list (`INITIAL_TOKENS`) wired into each app's
 *      `tokenMetadataAtom` so the form renders instantly before any
 *      network call.
 *   2. The fallback the server (`apps/api/src/services/tokens-proxy.ts`)
 *      serves from when the upstream `resolve` call fails — so account
 *      balances never render as truncated mints.
 *
 * Both apps and the api import from here — no duplication.
 */

export type Network = "mainnet" | "devnet" | "testnet" | "localnet";

export interface TokenMetadata {
  symbol: string;
  name?: string;
  decimals?: number;
  logoURI?: string;
  network?: Network;
}

export type TokenMetadataMap = Record<string, TokenMetadata>;

/**
 * The five well-known Tributary mints. The devnet USDC entry is included
 * so the form has a default value on devnet (the upstream catalog only
 * knows about mainnet mints).
 */
export const MINT_OVERRIDES: TokenMetadataMap = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    network: "mainnet",
  },
  So11111111111111111111111111111111111111112: {
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
    network: "mainnet",
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    network: "mainnet",
  },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: {
    symbol: "mSOL",
    name: "Marinade staked SOL",
    decimals: 9,
    network: "mainnet",
  },
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": {
    symbol: "USDC (devnet)",
    name: "USD Coin on Devnet",
    decimals: 6,
    network: "devnet",
  },
};

/** Alias preserved for app-store initialization naming. */
export const INITIAL_TOKENS: TokenMetadataMap = MINT_OVERRIDES;

/** Resolve a mint against the override map. Returns `null` if unknown. */
export function lookupOverride(mint: string): TokenMetadata | null {
  return MINT_OVERRIDES[mint] ?? null;
}

/**
 * Pick a sensible default mint for a given network: devnet USDC on devnet,
 * mainnet USDC elsewhere.
 */
export function defaultMintForNetwork(network: Network): string {
  if (network === "devnet" || network === "testnet" || network === "localnet") {
    return "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
  }
  return "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
}
