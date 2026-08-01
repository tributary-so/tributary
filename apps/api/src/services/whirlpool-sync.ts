/**
 * Orca Whirlpool normalizer (POOL-API §6.2).
 *
 * Syncs `GET {ORCA_API_BASE}/v1/whirlpools` — a FLAT full-list response (no
 * pagination; Orca ships every whirlpool in one ~17MB shot and ignores
 * limit/offset). Normalizes each whirlpool into a `pools` row, idempotently
 * upserts, and drains stale rows. Uses the DEDICATED sync pool (`getSyncDb`).
 *
 * Registered via `registerPoolNormalizer("whirlpool", whirlpoolSync)` in index.ts.
 *
 * ⚠ Endpoint shape: the Orca REST origin has been intermittently CF-1016; the
 * exact field names are therefore read DEFENSIVELY (tokenA/tokenB OR flat
 * mint_a/b; multiple fallbacks), exactly like Raydium/Meteora tolerate drift.
 *
 * TVL floor caveat (ponytail: Orca REST does not reliably ship a clean USD TVL):
 * the ~$1k floor ONLY drops pools with an explicit, below-floor TVL. A pool
 * whose TVL is unknown/absent is KEPT (dropping everything would defeat the
 * normalizer); stars still rank it. Upgrade path: compute TVL from reserves ×
 * price when a price oracle is wired.
 */

import { drainStalePools, upsertPools } from "../db/pools";
import { getSyncDb } from "./pools-sync";
import type { NewPool } from "../db/schema-pools";

const DEFAULT_API_BASE = "https://api.mainnet.orca.so";
const DEFAULT_TVL_FLOOR = 1000;
const DEFAULT_DRAIN_WINDOW_MS = 10 * 60 * 1000; // ~2 missed ticks at 5min
const DEFAULT_RETRIES = 3;
const DEFAULT_BACKOFF_BASE_MS = 1000;
const REQUEST_TIMEOUT_MS = 30_000; // full-list payload; allow more.

export interface WhirlpoolSyncOptions {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  tvlFloor?: number;
  drainWindowMs?: number;
  retries?: number;
  backoffBaseMs?: number;
}

export interface WhirlpoolSyncResult {
  upserted: number;
  drained: number;
  pages: number; // always 1 (flat list); kept for shape parity.
}

function envNum(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function apiBase(opts: WhirlpoolSyncOptions): string {
  return opts.baseUrl ?? process.env.ORCA_API_BASE ?? DEFAULT_API_BASE;
}

function floorOf(opts: WhirlpoolSyncOptions): number {
  return opts.tvlFloor ?? envNum("POOLS_TVL_FLOOR", DEFAULT_TVL_FLOOR);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function asNumber(v: unknown): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : (v as number);
  return Number.isFinite(n) ? (n as number) : 0;
}

/** True when `raw` exposes a positive numeric TVL the floor can bind to. */
function hasExplicitTvl(r: Record<string, any>): boolean {
  const v = r.tvl ?? r.tvlUsd ?? r.liquidityUsd ?? r.liquidity_usd;
  return v != null && asNumber(v) > 0;
}

/**
 * Normalize one raw Orca whirlpool into a `pools` row, or `null` when it lacks
 * a usable identity (address + both mints). The TVL floor ONLY drops pools with
 * an explicit below-floor TVL — see the module caveat.
 */
export function normalizeWhirlpoolPool(
  raw: unknown,
  floor: number,
  now: Date
): NewPool | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, any>;

  const address = r.whirlpoolAddress ?? r.address ?? r.id;
  const tokenA = r.tokenA ?? r.token_a;
  const tokenB = r.tokenB ?? r.token_b;
  const mintA = tokenA?.mint ?? r.mint_a ?? r.mintA ?? r.tokenAMint;
  const mintB = tokenB?.mint ?? r.mint_b ?? r.mintB ?? r.tokenBMint;
  if (!address || !mintA || !mintB) return null;

  // Floor binds only on explicit TVL — unknown TVL is kept (module caveat).
  if (hasExplicitTvl(r)) {
    const tvl = asNumber(
      r.tvl ?? r.tvlUsd ?? r.liquidityUsd ?? r.liquidity_usd
    );
    if (tvl < floor) return null;
  }
  const tvl = asNumber(r.tvl ?? r.tvlUsd ?? r.liquidityUsd ?? r.liquidity ?? 0);

  const feeRate = r.feeRate ?? r.fee_rate ?? null;
  const tickSpacing = r.tickSpacing ?? r.tick_spacing ?? null;

  return {
    address: String(address),
    venue: "whirlpool",
    mintA: String(mintA),
    mintB: String(mintB),
    symbolA: tokenA?.symbol ?? r.symbol_a ?? r.symbolA ?? null,
    symbolB: tokenB?.symbol ?? r.symbol_b ?? r.symbolB ?? null,
    tvl: String(tvl),
    feeRate: feeRate != null ? String(feeRate) : null,
    extras: tickSpacing != null ? { tickSpacing } : {},
    refreshedAt: now,
  };
}

/**
 * Fetch the full /v1/whirlpools list (one shot — no pagination). Retries
 * 429/5xx with exponential backoff. Throws on persistent failure (per-venue
 * isolation in the orchestrator).
 */
export async function fetchWhirlpoolPools(
  opts: WhirlpoolSyncOptions
): Promise<unknown[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const baseMs = opts.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS;

  const url = `${apiBase(opts)}/v1/whirlpools`;

  let lastStatus = 0;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response;
    try {
      res = await fetchImpl(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      lastStatus = -1;
      if (attempt === retries)
        throw new Error(`whirlpool fetch failed: ${(err as Error).message}`);
      await sleep(baseMs * 2 ** attempt);
      continue;
    }

    if (res.status === 429 || res.status >= 500) {
      lastStatus = res.status;
      if (attempt === retries)
        throw new Error(
          `whirlpool upstream ${res.status} after ${retries} retries`
        );
      await sleep(baseMs * 2 ** attempt);
      continue;
    }
    if (!res.ok) {
      throw new Error(`whirlpool upstream ${res.status}`);
    }

    const body = (await res.json()) as any;
    return extractPools(body);
  }
  throw new Error(
    `whirlpool upstream ${lastStatus} exhausted retries (should be unreachable)`
  );
}

/** Pull the pool array out of flat / {data:{whirlpools}} / {whirlpools} shapes. */
function extractPools(body: any): unknown[] {
  if (Array.isArray(body)) return body;
  const nested = body?.data;
  const arr =
    nested?.whirlpools ?? body?.whirlpools ?? nested?.rows ?? body?.rows ?? [];
  return Array.isArray(arr) ? arr : [];
}

/**
 * Full Whirlpool sync tick: fetch the flat list, normalize + floor, idempotently
 * upsert, then drain stale rows. Returns counts.
 */
export async function whirlpoolSync(
  opts: WhirlpoolSyncOptions = {}
): Promise<WhirlpoolSyncResult> {
  const db = getSyncDb();
  const now = new Date();
  const floor = floorOf(opts);
  const drainWindow = opts.drainWindowMs ?? DEFAULT_DRAIN_WINDOW_MS;

  const raw = await fetchWhirlpoolPools(opts);
  const rows: NewPool[] = [];
  for (const item of raw) {
    const row = normalizeWhirlpoolPool(item, floor, now);
    if (row) rows.push(row);
  }

  await upsertPools(db, rows);
  const drained = await drainStalePools(
    db,
    "whirlpool",
    new Date(now.getTime() - drainWindow)
  );

  return { upserted: rows.length, drained, pages: 1 };
}
