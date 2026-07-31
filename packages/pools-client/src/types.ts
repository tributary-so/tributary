/**
 * Types for the Tributary /v1/pools/search endpoint (pool resolver
 * service). These mirror the response envelope produced by the
 * server-side pool search at `apps/api/src/routes/pools.ts`.
 *
 * See the "Pool resolver service" milestone (tributary-gq0p) HANDOFF §2
 * for the authoritative data contract.
 */

/** DEX venue backing a pool. The server validates this query param. */
export type PoolVenue = "meteora" | "raydium" | "whirlpool";

/** tokens.xyz trust tier for a pool leg token. */
export type TokenTier = "tier1" | "tier2" | "tier3" | null;

/** Identity + trust metadata for one leg of a pool. */
export interface PoolToken {
  /** Solana base58 mint. */
  mint: string;
  symbol: string | null;
  decimals: number | null;
  logo_uri: string | null;
  tier: TokenTier;
}

/** A single ranked pool row in a search response. */
export interface PoolSearchResult {
  /** Pool account address (base58). */
  address: string;
  venue: PoolVenue;
  token_x: PoolToken;
  token_y: PoolToken;
  /** TVL in USD at last sync (NUMERIC on the server). */
  tvl: number | null;
  /** Pool fee rate (basis points or fraction — venue-dependent). */
  feeRate: number | null;
  /** Precomputed trust stars: 0|1|2 (one per known leg token). */
  stars: number;
  /** True when either leg token is tier1. */
  tier1: boolean;
  /** Venue-specific extras (JSONB on the server). */
  extras: Record<string, unknown> | null;
}

/** Envelope `data` returned by `GET /v1/pools/search`. */
export interface PoolSearchResponse {
  query: string;
  venue: PoolVenue;
  results: PoolSearchResult[];
}

/** Options accepted by the client `searchPools()` call. */
export interface SearchPoolsOptions {
  /** Required venue filter. */
  venue: PoolVenue;
  /** Max results to request. Default 20. */
  limit?: number;
  /** Abort the upstream request. */
  signal?: AbortSignal;
}
