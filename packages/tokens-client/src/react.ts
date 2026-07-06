/**
 * React hooks for the Tributary `/v1/assets` proxy.
 *
 * Peer-depends on `@tanstack/react-query` v5. Apps that don't use the
 * hooks can ignore this module entirely — `client.ts` has no React.
 */

import { useEffect, useRef, useState } from "react";
import {
  useQuery,
  useQueries,
  type UseQueryResult,
} from "@tanstack/react-query";

import { createTokensClient, type TokensClient } from "./client";
import type { AssetSearchResponse, ResolveResult } from "./types";

export interface UseAssetsClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
}

export interface UseAssetSearchOptions {
  enabled?: boolean;
  limit?: number;
  /** Debounce window in ms. Default 250. */
  debounceMs?: number;
}

/**
 * Lazy singleton — one client per baseUrl per app. Avoids re-creating the
 * closure on every render.
 */
function useClient({ baseUrl, fetch }: UseAssetsClientOptions): TokensClient {
  const ref = useRef<TokensClient | null>(null);
  if (!ref.current) {
    ref.current = createTokensClient({ baseUrl, fetch });
  }
  return ref.current;
}

/**
 * Type-ahead search. Debounced by `debounceMs`. Disables itself for
 * sub-1-char queries. Returns the upstream envelope (or empty results on
 * error — the server is the source of the empty-state stance).
 */
export function useAssetSearch(
  query: string,
  clientOpts: UseAssetsClientOptions,
  opts: UseAssetSearchOptions = {},
) {
  const client = useClient(clientOpts);
  const { enabled = true, limit = 20, debounceMs = 250 } = opts;

  // Debounce: delay the query key transition so react-query doesn't fire
  // on every keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(t);
  }, [query, debounceMs]);

  const trimmed = debouncedQuery.trim();
  const canQuery = enabled && trimmed.length >= 1;

  return useQuery<AssetSearchResponse>({
    queryKey: ["tokens", "search", trimmed, limit],
    queryFn: ({ signal }) => client.search(trimmed, { limit, signal }),
    enabled: canQuery,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

/**
 * Resolve a single mint. Returns `null` data when the upstream has no
 * mapping (and no baked-in override matches).
 */
export function useResolveMint(
  mint: string | null | undefined,
  clientOpts: UseAssetsClientOptions,
  opts: { enabled?: boolean } = {},
) {
  const client = useClient(clientOpts);
  const enabled = opts.enabled ?? Boolean(mint);
  return useQuery<ResolveResult | null>({
    queryKey: ["tokens", "resolve", mint ?? ""],
    queryFn: ({ signal }) =>
      mint ? client.resolveMint(mint, { signal }) : Promise.resolve(null),
    enabled: enabled && Boolean(mint),
    staleTime: 10 * 60_000,
  });
}

/**
 * Resolve N mints in parallel via react-query's `useQueries`. Typical
 * wallet <20 tokens. Stable ordering matches the deduped input array.
 */
export function useResolveMints(
  mints: string[],
  clientOpts: UseAssetsClientOptions,
  opts: { enabled?: boolean } = {},
) {
  const client = useClient(clientOpts);
  const enabled = opts.enabled ?? true;
  const unique = Array.from(new Set(mints.filter(Boolean)));
  return useQueries({
    queries: unique.map((mint) => ({
      queryKey: ["tokens", "resolve", mint] as const,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        client.resolveMint(mint, { signal }),
      enabled,
      staleTime: 10 * 60_000,
    })),
  }) as UseQueryResult<ResolveResult | null>[];
}
