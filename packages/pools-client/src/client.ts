/**
 * Pure-fetch client for the Tributary `/v1/pools/search` endpoint.
 *
 * No React, no globals. The caller supplies `baseUrl` (the API origin,
 * e.g. `https://api.tributary.so`) and optionally a `fetch` impl
 * (Node 18+ has global fetch; tests can inject a mock).
 */

import type {
  PoolSearchResponse,
  PoolVenue,
  SearchPoolsOptions,
} from "./types";

export interface PoolsClient {
  searchPools(
    query: string,
    opts: SearchPoolsOptions,
  ): Promise<PoolSearchResponse>;
}

export interface CreatePoolsClientOptions {
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
 * Build a client. Upstream/sync failures are handled server-side per
 * ADR-0028 D3 (search → empty results), so this client returns an empty
 * response on non-2xx rather than throwing.
 */
export function createPoolsClient(opts: CreatePoolsClientOptions): PoolsClient {
  const base = opts.baseUrl.replace(/\/+$/, "");
  const fetchImpl = opts.fetch ?? fetch;

  async function get<T>(
    pathAndQuery: string,
    signal?: AbortSignal,
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
    async searchPools(query, sopts) {
      const q = query.trim();
      const venue: PoolVenue = sopts.venue;
      if (!q) return { query: q, venue, results: [] };
      const limit = Math.max(1, Math.min(50, sopts.limit ?? 20));
      const params = new URLSearchParams({
        q,
        venue,
        limit: String(limit),
      });
      const data = await get<PoolSearchResponse>(
        `/v1/pools/search?${params.toString()}`,
        sopts.signal,
      );
      return data ?? { query: q, venue, results: [] };
    },
  };
}
