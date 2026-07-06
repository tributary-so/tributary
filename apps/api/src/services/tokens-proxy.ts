/**
 * Upstream tokens.xyz client + cache + fallback.
 *
 * - Wraps https://api.tokens.xyz/v1/assets/{search,resolve}.
 * - Redis-cached per ADR-0028 D3 (search TTL 60s, resolve TTL 10min).
 * - On upstream failure: search → empty results, resolve → baked-in
 *   MINT_OVERRIDES fallback (shared from packages/tokens-client).
 *
 * The x-api-key is injected here, never logged, never shipped to the
 * browser. The browser only talks to our `/v1/assets/*` proxy.
 */

import { PublicKey } from "@solana/web3.js";
import {
  MINT_OVERRIDES,
  type AssetSearchResult,
  type AssetSearchResponse,
  type ResolveResult,
} from "@tributary-so/tokens-client";
import { cacheGet, cacheSet } from "./redis";

const UPSTREAM_BASE =
  process.env.TOKENS_XYZ_BASE_URL ?? "https://api.tokens.xyz/v1";
const UPSTREAM_KEY = process.env.TOKENS_XYZ_API_KEY ?? "";

const SEARCH_TTL = 60;
const RESOLVE_TTL = 600;

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function isValidMint(s: unknown): s is string {
  if (typeof s !== "string" || !BASE58_RE.test(s)) return false;
  try {
    // Length-only check is faster; PublicKey validates the curve point.
    new PublicKey(s);
    return true;
  } catch {
    return false;
  }
}

/** Shape returned by upstream. We project down to AssetSearchResult. */
interface UpstreamAsset {
  assetId?: string;
  symbol?: string;
  name?: string;
  category?: string | null;
  imageUrl?: string | null;
  variants?: Array<{
    mint?: string;
    decimals?: number;
    kind?: string;
    trustTier?: string | null;
    primary?: boolean;
  }>;
}

interface UpstreamSearchEnvelope {
  query?: string;
  results?: UpstreamAsset[];
}

interface UpstreamResolveEnvelope {
  mint?: string;
  assetId?: string;
  symbol?: string;
  name?: string;
  decimals?: number | null;
  imageUrl?: string | null;
  category?: string | null;
}

function pickPrimaryVariant(
  asset: UpstreamAsset
): AssetSearchResult["primaryVariant"] {
  const variants = Array.isArray(asset.variants) ? asset.variants : [];
  const chosen = variants.find((v) => v.primary) ?? variants[0] ?? null;
  if (!chosen || !isValidMint(chosen.mint)) return null;
  return {
    mint: chosen.mint,
    decimals: typeof chosen.decimals === "number" ? chosen.decimals : 6,
    kind: typeof chosen.kind === "string" ? chosen.kind : "unknown",
    trustTier: chosen.trustTier ?? null,
  };
}

function projectAsset(asset: UpstreamAsset): AssetSearchResult | null {
  if (!asset || typeof asset !== "object") return null;
  const primaryVariant = pickPrimaryVariant(asset);
  // Server filters out any result whose primaryVariant is missing — no
  // usable SPL mint means Tributary can't move the asset.
  if (!primaryVariant) return null;
  return {
    assetId: asset.assetId ?? "",
    symbol: asset.symbol ?? "",
    name: asset.name ?? asset.symbol ?? "",
    category: asset.category ?? null,
    imageUrl: asset.imageUrl ?? null,
    primaryVariant,
  };
}

async function upstreamFetch<T>(pathAndQuery: string): Promise<T | null> {
  if (!UPSTREAM_KEY) {
    console.warn(
      "[tokens-proxy] TOKENS_XYZ_API_KEY is unset — upstream calls disabled"
    );
    return null;
  }
  const url = `${UPSTREAM_BASE}${pathAndQuery}`;
  try {
    const res = await fetch(url, {
      headers: {
        "x-api-key": UPSTREAM_KEY,
        accept: "application/json",
      },
      // Don't let upstream hang the request indefinitely.
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      console.warn(
        `[tokens-proxy] upstream ${res.status} for ${
          pathAndQuery.split("?")[0]
        }`
      );
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(
      `[tokens-proxy] upstream error for ${pathAndQuery.split("?")[0]}:`,
      (err as Error).message
    );
    return null;
  }
}

export async function searchAssets(
  query: string,
  limit: number
): Promise<AssetSearchResponse> {
  const q = query.trim();
  if (!q) return { query: q, results: [] };

  const cappedLimit = Math.max(1, Math.min(50, limit));
  const cacheKey = `tokens:search:${q}:${cappedLimit}`;
  const cached = await cacheGet<AssetSearchResponse>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({ q, limit: String(cappedLimit) });
  const upstream = await upstreamFetch<UpstreamSearchEnvelope>(
    `/assets/search?${params.toString()}`
  );

  const results: AssetSearchResult[] = (upstream?.results ?? [])
    .map(projectAsset)
    .filter((r): r is AssetSearchResult => r !== null)
    .slice(0, cappedLimit);

  const payload: AssetSearchResponse = { query: q, results };
  await cacheSet(cacheKey, payload, SEARCH_TTL);
  return payload;
}

export async function resolveAsset(
  mint: string
): Promise<ResolveResult | null> {
  if (!isValidMint(mint)) return null;

  const cacheKey = `tokens:resolve:${mint}`;
  const cached = await cacheGet<ResolveResult>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({ mint });
  const upstream = await upstreamFetch<UpstreamResolveEnvelope>(
    `/assets/resolve?${params.toString()}`
  );

  let payload: ResolveResult | null = null;
  if (upstream && (upstream.symbol || upstream.name)) {
    payload = {
      mint,
      assetId: upstream.assetId ?? null,
      symbol: upstream.symbol ?? mint.slice(0, 4) + "...",
      name: upstream.name ?? null,
      decimals: typeof upstream.decimals === "number" ? upstream.decimals : 6,
      imageUrl: upstream.imageUrl ?? null,
      category: upstream.category ?? null,
    };
  }

  // Fallback to baked-in MINT_OVERRIDES when upstream is unavailable.
  if (!payload) {
    const override = MINT_OVERRIDES[mint];
    if (override) {
      payload = {
        mint,
        assetId: null,
        symbol: override.symbol,
        name: override.name ?? null,
        decimals: override.decimals ?? null,
        imageUrl: override.logoURI ?? null,
        category: override.network === "mainnet" ? "native" : null,
      };
    }
  }

  if (payload) await cacheSet(cacheKey, payload, RESOLVE_TTL);
  return payload;
}
