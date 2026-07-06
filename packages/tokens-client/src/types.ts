/**
 * Types for the Tributary /v1/assets proxy (tokens.xyz catalog).
 *
 * These mirror the slim response shapes produced by the server-side proxy
 * at `apps/api/src/routes/assets.ts` (see ADR-0028). The server is the
 * authority — it filters upstream results to ones that carry a usable
 * Solana SPL mint.
 */

/** Asset category as reported by the upstream catalog. */
export type AssetCategory =
  | "equity"
  | "stablecoin"
  | "lst"
  | "native"
  | "wrapped"
  | "tokenized_equity"
  | string
  | null;

/** A single variant (chain/mint pair) attached to an asset. */
export interface AssetVariant {
  /** Solana base58 mint. Always present — the server filters otherwise. */
  mint: string;
  decimals: number;
  /** "native" | "tokenized_equity" | "wrapped" | ... */
  kind: string;
  /** "tier1" | "tier2" | "tier3" | null */
  trustTier: string | null;
}

/** A search result row. `primaryVariant` is null if no usable mint exists. */
export interface AssetSearchResult {
  assetId: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  imageUrl: string | null;
  primaryVariant: AssetVariant | null;
}

/** Envelope returned by `GET /v1/assets/search`. */
export interface AssetSearchResponse {
  query: string;
  results: AssetSearchResult[];
}

/** Envelope returned by `GET /v1/assets/resolve`. */
export interface ResolveResult {
  mint: string;
  assetId: string | null;
  symbol: string;
  name: string | null;
  decimals: number | null;
  imageUrl: string | null;
  category: AssetCategory;
}

/** Options accepted by the client `search()` call. */
export interface SearchOptions {
  /** Max results to request. Default 20. */
  limit?: number;
  /** Abort the upstream request. */
  signal?: AbortSignal;
}

/** Options accepted by the client `resolveMint()` / `resolveRef()` calls. */
export interface ResolveOptions {
  signal?: AbortSignal;
}
