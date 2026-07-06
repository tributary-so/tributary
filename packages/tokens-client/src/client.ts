/**
 * Pure-fetch client for the Tributary `/v1/assets` proxy.
 *
 * No React, no globals. The caller supplies `baseUrl` (the API origin,
 * e.g. `https://api.tributary.so`) and optionally a `fetch` impl
 * (Node 18+ has global fetch; tests can inject a mock).
 */

import type {
  AssetSearchResponse,
  ResolveResult,
  SearchOptions,
  ResolveOptions,
} from "./types";

export interface TokensClient {
  search(query: string, opts?: SearchOptions): Promise<AssetSearchResponse>;
  resolveMint(
    mint: string,
    opts?: ResolveOptions
  ): Promise<ResolveResult | null>;
  resolveRef(ref: string, opts?: ResolveOptions): Promise<ResolveResult | null>;
}

export interface CreateTokensClientOptions {
  /** API origin, e.g. `https://api.tributary.so`. No trailing slash. */
  baseUrl: string;
  /** Override fetch (defaults to global fetch). */
  fetch?: typeof fetch;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

/**
 * Build a client. Throws on non-2xx only when the server itself rejects
 * (validation errors); upstream-failure stances are handled server-side
 * per ADR-0028 D3 (search → empty results, resolve → null).
 */
export function createTokensClient(
  opts: CreateTokensClientOptions
): TokensClient {
  const base = opts.baseUrl.replace(/\/+$/, "");
  const fetchImpl = opts.fetch ?? fetch;

  async function get<T>(
    pathAndQuery: string,
    signal?: AbortSignal
  ): Promise<T | null> {
    const res = await fetchImpl(`${base}${pathAndQuery}`, {
      headers: { accept: "application/json" },
      signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ApiEnvelope<T>;
    if (!body.success || !body.data) return null;
    return body.data;
  }

  return {
    async search(query, sopts) {
      const q = query.trim();
      if (!q) return { query: q, results: [] };
      const limit = Math.max(1, Math.min(50, sopts?.limit ?? 20));
      const params = new URLSearchParams({ q, limit: String(limit) });
      const data = await get<AssetSearchResponse>(
        `/v1/assets/search?${params.toString()}`,
        sopts?.signal
      );
      return data ?? { query: q, results: [] };
    },

    async resolveMint(mint, ropts) {
      const params = new URLSearchParams({ mint });
      return get<ResolveResult>(
        `/v1/assets/resolve?${params.toString()}`,
        ropts?.signal
      );
    },

    async resolveRef(ref, ropts) {
      // ponytail: upstream ref resolution is forward-only — we route the
      // ref through the search endpoint and pick the first asset's
      // primaryVariant. No separate upstream endpoint exists yet.
      const data = await this.search(ref, { limit: 1, signal: ropts?.signal });
      const top = data.results[0];
      const variant = top?.primaryVariant;
      if (!variant) return null;
      return {
        mint: variant.mint,
        assetId: top.assetId,
        symbol: top.symbol,
        name: top.name,
        decimals: variant.decimals,
        imageUrl: top.imageUrl,
        category: top.category,
      };
    },
  };
}
