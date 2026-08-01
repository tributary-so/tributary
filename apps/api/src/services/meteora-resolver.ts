/**
 * Meteora DLMM live-proxy resolver (POOL-API §6.1).
 *
 * Meteora already answers free-text, so we do NOT index it (a sync job would be
 * pure overhead). On `venue=meteora` the resolver forwards the parsed query to
 * Meteora's own search endpoint, normalizes each hit to a `PoolSearchHit`, and
 * trust-joins via tokens.xyz `resolveAsset` (Redis-cached) for stars/tier1/
 * logos. Same `PoolResult`, same stars — the live-vs-indexed split is entirely
 * server-internal (`mode` is client-invisible; dispatch lives in pools-search).
 *
 * ⚠ Endpoint reachability: `dlmm-api.meteora.ag` is unreachable from some
 * environments (Cloudflare 404 on every path). The default path/shape below are
 * the publicly-attested `/pair/all_by_groups?search_term=` form, kept
 * defensive (multiple envelope shapes) + env-overridable. The path is isolated
 * in ONE function — a one-line fix when the deploy host can reach upstream.
 *
 * No TVL floor on the live path (D6 floor is an indexed-venue perf cut);
 * Meteora's own `sort_by=tvl:desc` + `is_blacklisted=false` ranks upstream.
 */

import { resolveAsset } from "./tokens-proxy";
import type { PoolSearchHit } from "../db/pools";
import type { Pool, PoolToken } from "../db/schema-pools";

const DEFAULT_API_BASE = "https://dlmm-api.meteora.ag";
const DEFAULT_SEARCH_PATH = "/pair/all_by_groups";
const DEFAULT_LIMIT = 20;
const REQUEST_TIMEOUT_MS = 8_000;
const RESOLVE_CONCURRENCY = 6;

export interface MeteoraResolverOptions {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  searchPath?: string;
  timeoutMs?: number;
}

function apiBase(opts: MeteoraResolverOptions): string {
  return opts.baseUrl ?? process.env.METEORA_API_BASE ?? DEFAULT_API_BASE;
}

function searchPath(opts: MeteoraResolverOptions): string {
  return (
    opts.searchPath ?? process.env.METEORA_SEARCH_PATH ?? DEFAULT_SEARCH_PATH
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function asNumber(v: unknown): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : (v as number);
  return Number.isFinite(n) ? (n as number) : 0;
}

interface RawMeteoraPool {
  address: string;
  mintA: string;
  mintB: string;
  symbolA: string | null;
  symbolB: string | null;
  tvl: number;
  feeRate: number | null;
  binStep: number | null;
}

/**
 * Normalize one raw Meteora pool (defensive field reads; tolerates shape drift)
 * into the identity needed for a `PoolSearchHit`. Returns null when the entry
 * lacks a usable identity (address + both mints).
 */
export function normalizeMeteoraPool(raw: unknown): RawMeteoraPool | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, any>;

  const address = r.address ?? r.pairAddress ?? r.id;
  const mintA = r.mint_x ?? r.mintX ?? r.tokenXMint;
  const mintB = r.mint_y ?? r.mintY ?? r.tokenYMint;
  if (!address || !mintA || !mintB) return null;

  return {
    address: String(address),
    mintA: String(mintA),
    mintB: String(mintB),
    symbolA: r.name_x ?? r.symbol_x ?? r.symbolX ?? null,
    symbolB: r.name_y ?? r.symbol_y ?? r.symbolY ?? null,
    tvl: asNumber(r.tvl ?? r.tvlUsd ?? r.liquidity ?? r.liquidityUsd),
    feeRate: r.fee_percentage ?? r.feePercentage ?? r.baseFeePct ?? null,
    binStep: r.bin_step ?? r.binStep ?? null,
  };
}

/**
 * Pull the pool array out of a Meteora search response. `/pair/all_by_groups`
 * nests pools under `groups[]`; the extractor also tolerates a flat array and
 * `{data|rows: [...]}` envelopes so a minor upstream shape change doesn't break
 * the resolver.
 */
export function extractMeteoraPools(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const b = body as Record<string, any> | null;
  if (!b) return [];
  // groups: [ { pools/spairs/pairs: [...] }, ... ] — flatten.
  if (Array.isArray(b.groups)) {
    return b.groups.flatMap((g: any) =>
      Array.isArray(g?.pools)
        ? g.pools
        : Array.isArray(g?.spairs)
        ? g.spairs
        : Array.isArray(g?.pairs)
        ? g.pairs
        : Array.isArray(g)
        ? g
        : []
    );
  }
  const arr = b.data ?? b.rows ?? b.pools ?? b.pairs ?? [];
  return Array.isArray(arr) ? arr : [];
}

/**
 * Fetch Meteora's free-text search. Retries 429/5xx once with a short backoff
 * (live path — keep latency bounded; the Redis cache absorbs steady-state load).
 * Throws on persistent failure (the caller applies the empty-not-500 stance).
 */
export async function fetchMeteoraSearch(
  query: string,
  limit: number,
  opts: MeteoraResolverOptions = {}
): Promise<unknown[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeout = opts.timeoutMs ?? REQUEST_TIMEOUT_MS;

  const params = new URLSearchParams({
    search_term: query,
    sort_key: "tvl",
    order_by: "desc",
    page_size: String(limit),
    include_unknown: "false",
  });
  const url = `${apiBase(opts)}${searchPath(opts)}?${params.toString()}`;

  for (let attempt = 0; attempt <= 1; attempt++) {
    let res: Response;
    try {
      res = await fetchImpl(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeout),
      });
    } catch (err) {
      if (attempt === 1)
        throw new Error(`meteora live fetch failed: ${(err as Error).message}`);
      await sleep(500);
      continue;
    }

    if (res.status === 429 || res.status >= 500) {
      if (attempt === 1) throw new Error(`meteora live upstream ${res.status}`);
      await sleep(500);
      continue;
    }
    if (!res.ok) throw new Error(`meteora live upstream ${res.status}`);

    return extractMeteoraPools(await res.json());
  }
  return [];
}

/** Resolve a batch of unique mints via tokens.xyz (trust-join), bounded. */
async function resolveMints(
  mints: string[]
): Promise<
  Map<string, { token: PoolToken | null; known: boolean; tier1: boolean }>
> {
  const out = new Map<
    string,
    { token: PoolToken | null; known: boolean; tier1: boolean }
  >();
  for (let i = 0; i < mints.length; i += RESOLVE_CONCURRENCY) {
    const batch = mints.slice(i, i + RESOLVE_CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (mint) => {
        try {
          const asset = await resolveAsset(mint);
          const token: PoolToken | null = asset
            ? {
                mint,
                known: true,
                tier: asset.tier ?? null,
                symbol: asset.symbol ?? null,
                name: asset.name ?? null,
                decimals: asset.decimals ?? null,
                logoUri: asset.imageUrl ?? null,
                refreshedAt: new Date(),
              }
            : null;
          return [
            mint,
            { token, known: !!asset, tier1: asset?.tier === "tier1" },
          ] as const;
        } catch {
          return [mint, { token: null, known: false, tier1: false }] as const;
        }
      })
    );
    for (const [mint, info] of settled) out.set(mint, info);
  }
  return out;
}

/**
 * Live-proxy search: forward the query to Meteora, normalize, trust-join.
 * Returns `PoolSearchHit[]` (synthetic `pool` rows — live pools aren't indexed).
 * Stars derive inline from resolveAsset (the indexed `tokens` table doesn't
 * cover live-venue mints). Per-mint failures are isolated.
 */
export async function searchMeteoraLive(
  query: string,
  opts: { limit: number } & MeteoraResolverOptions
): Promise<PoolSearchHit[]> {
  const limit = Math.max(1, Math.min(50, opts.limit ?? DEFAULT_LIMIT));
  const q = query.trim();
  if (!q) return [];

  const raw = await fetchMeteoraSearch(q, limit, opts);
  const identities = raw
    .map(normalizeMeteoraPool)
    .filter((p): p is RawMeteoraPool => p !== null);
  if (identities.length === 0) return [];

  // Dedupe mints across the result set before the trust-join.
  const uniqueMints = Array.from(
    new Set(identities.flatMap((p) => [p.mintA, p.mintB]))
  );
  const trust = await resolveMints(uniqueMints);
  const now = new Date();

  return identities.map((p): PoolSearchHit => {
    const a = trust.get(p.mintA)!;
    const b = trust.get(p.mintB)!;
    const pool: Pool = {
      address: p.address,
      venue: "meteora",
      mintA: p.mintA,
      mintB: p.mintB,
      symbolA: p.symbolA,
      symbolB: p.symbolB,
      tvl: String(p.tvl),
      feeRate: p.feeRate != null ? String(p.feeRate) : null,
      // Inline star precompute: known(a) + known(b).
      stars: (a.known ? 1 : 0) + (b.known ? 1 : 0),
      tier1: a.tier1 || b.tier1,
      extras: p.binStep != null ? { binStep: p.binStep } : {},
      refreshedAt: now,
    };
    return { pool, tokenA: a.token, tokenB: b.token };
  });
}
