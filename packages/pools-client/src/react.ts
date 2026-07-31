/**
 * React hooks for the Tributary `/v1/pools/search` endpoint.
 *
 * Peer-depends on `@tanstack/react-query` v5 + `react`. Apps that don't
 * use the hooks can ignore this module — `client.ts` has no React.
 */

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { createPoolsClient, type PoolsClient } from "./client";
import type { PoolSearchResponse, PoolVenue } from "./types";

// Presentational PoolPicker (rows + uniform onSelect + direction helpers).
// Re-exported here so `@tributary-so/pools-client/react` is the single React
// entry — hooks + picker. See bean tributary-i2nd.
export * from "./picker";

export interface UsePoolsClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
}

export interface UsePoolSearchOptions {
  /** Required venue filter. */
  venue: PoolVenue;
  enabled?: boolean;
  limit?: number;
  /** Debounce window in ms. Default 250. */
  debounceMs?: number;
}

/**
 * Lazy singleton — one client per baseUrl per app. Avoids re-creating the
 * closure on every render.
 */
function useClient({ baseUrl, fetch }: UsePoolsClientOptions): PoolsClient {
  const ref = useRef<PoolsClient | null>(null);
  if (!ref.current) {
    ref.current = createPoolsClient({ baseUrl, fetch });
  }
  return ref.current;
}

/**
 * Type-ahead pool search. Debounced by `debounceMs` (default 250ms).
 * Disables itself for empty/whitespace queries. Returns the upstream
 * envelope (or empty results on error — the server's empty-not-500
 * stance per ADR-0028 D3).
 *
 * ONE hook for all venues — `venue` is a param, not a branch. Direct
 * replacement for per-venue hooks (useRaydiumPoolSearch, etc.).
 */
export function usePoolSearch(
  query: string,
  clientOpts: UsePoolsClientOptions,
  opts: UsePoolSearchOptions,
) {
  const client = useClient(clientOpts);
  const { venue, enabled = true, limit = 20, debounceMs = 250 } = opts;

  // Debounce: delay the query key transition so react-query doesn't fire
  // on every keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(t);
  }, [query, debounceMs]);

  const trimmed = debouncedQuery.trim();
  const canQuery = enabled && trimmed.length >= 1;

  return useQuery<PoolSearchResponse>({
    queryKey: ["pools", "search", venue, trimmed, limit],
    queryFn: ({ signal }) =>
      client.searchPools(trimmed, { venue, limit, signal }),
    enabled: canQuery,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
