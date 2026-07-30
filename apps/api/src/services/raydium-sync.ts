/**
 * Raydium CLMM pool normalizer (bean tributary-jh0p).
 *
 * Syncs `GET {RAYDIUM_API_BASE}/pools/info/list-v2?poolType=concentrated&
 * sortType=desc&size=<N>&nextPageId=<cursor>` with an opaque `nextPageId`
 * cursor, normalizes each concentrated pool into a `pools` row, drops rows
 * below the ~$1k TVL floor (HANDOFF §3 — a perf/dust cut, NOT a trust cut),
 * idempotently upserts, and drains stale rows. Uses the DEDICATED sync pool
 * (`getSyncDb`) so the crawler never starves request-serving.
 *
 * Registered via `registerPoolNormalizer("raydium", raydiumSync)` in index.ts.
 * Star precompute (stars/tier1) is podi's concern — this layer writes pool
 * rows only; recomputeStarsForMint fires when podi refreshes tokens.
 *
 * Raydium has NO free-text upstream, so this index IS the symbol-search feature
 * (milestone tributary-gq0p, the original Mill UX bug).
 *
 * `fetchImpl`, base URL, page size, TVL floor, and backoff are injectable so the
 * full pipeline — pagination, floor, upsert, drain, 429/5xx backoff — is
 * unit-testable without a live Raydium endpoint.
 */

import { drainStalePools, upsertPools } from "../db/pools";
import { getSyncDb } from "./pools-sync";
import type { NewPool } from "../db/schema-pools";

const DEFAULT_API_BASE = "https://api.raydium.io/v3/mainnet";
const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_TVL_FLOOR = 1000;
const DEFAULT_DRAIN_WINDOW_MS = 10 * 60 * 1000; // ~2 missed ticks at 5min
const DEFAULT_RETRIES = 3;
const DEFAULT_BACKOFF_BASE_MS = 1000;
const REQUEST_TIMEOUT_MS = 15_000;

export interface RaydiumSyncOptions {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  pageSize?: number;
  tvlFloor?: number;
  drainWindowMs?: number;
  retries?: number;
  backoffBaseMs?: number;
}

export interface RaydiumListPage {
  data: unknown[];
  nextPageId: string | number | null;
}

export interface RaydiumSyncResult {
  upserted: number;
  drained: number;
  pages: number;
}

function envNum(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function apiBase(opts: RaydiumSyncOptions): string {
  return opts.baseUrl ?? process.env.RAYDIUM_API_BASE ?? DEFAULT_API_BASE;
}
function pageSizeOf(opts: RaydiumSyncOptions): number {
  return opts.pageSize ?? envNum("RAYDIUM_PAGE_SIZE", DEFAULT_PAGE_SIZE);
}
function floorOf(opts: RaydiumSyncOptions): number {
  return opts.tvlFloor ?? envNum("POOLS_TVL_FLOOR", DEFAULT_TVL_FLOOR);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function asNumber(v: unknown): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : (v as number);
  return Number.isFinite(n) ? (n as number) : 0;
}

/**
 * Normalize one raw Raydium concentrated pool into a `pools` row, or `null`
 * when it lacks a usable identity (address + both mints) or sits below the TVL
 * floor. Defensive field reading: tolerates minor upstream shape drift.
 */
export function normalizeRaydiumPool(
  raw: unknown,
  floor: number,
  now: Date
): NewPool | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, any>;

  const address = r.id ?? r.address ?? r.poolAddress;
  const mintARaw = r.mintA ?? r.mint_a;
  const mintBRaw = r.mintB ?? r.mint_b;
  const mintA = mintARaw?.address ?? mintARaw?.mint ?? r.mintAddressA;
  const mintB = mintBRaw?.address ?? mintBRaw?.mint ?? r.mintAddressB;
  if (!address || !mintA || !mintB) return null;

  const tvl = asNumber(r.tvl ?? r.tvlUsd ?? r.liquidityUsd);
  if (tvl < floor) return null;

  const feeRate = r.ammConfig?.tradeFeeRate ?? r.feeRate ?? r.fee_rate ?? null;

  return {
    address: String(address),
    venue: "raydium",
    mintA: String(mintA),
    mintB: String(mintB),
    symbolA: mintARaw?.symbol ?? r.symbolA ?? null,
    symbolB: mintBRaw?.symbol ?? r.symbolB ?? null,
    tvl: String(tvl),
    feeRate: feeRate != null ? String(feeRate) : null,
    extras: { ammConfig: r.ammConfig ?? r.ammConfigId ?? null },
    refreshedAt: now,
  };
}

/**
 * Fetch one list-v2 page. Builds the cursor query, retries 429/5xx with
 * exponential backoff. Throws on persistent failure (the orchestrator isolates
 * per-venue errors, so one failing venue never blocks the others).
 */
export async function fetchRaydiumPage(
  opts: RaydiumSyncOptions & { nextPageId?: string | number | null }
): Promise<RaydiumListPage> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const size = pageSizeOf(opts);
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const baseMs = opts.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS;

  const params = new URLSearchParams({
    poolType: "concentrated",
    sortType: "desc",
    size: String(size),
  });
  if (opts.nextPageId != null && opts.nextPageId !== "") {
    params.set("nextPageId", String(opts.nextPageId));
  }
  const url = `${apiBase(opts)}/pools/info/list-v2?${params.toString()}`;

  let lastStatus = 0;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response;
    try {
      res = await fetchImpl(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      // Network error: back off and retry — transient infra failures shouldn't
      // kill the whole sync tick.
      lastStatus = -1;
      if (attempt === retries)
        throw new Error(`raydium fetch failed: ${(err as Error).message}`);
      await sleep(baseMs * 2 ** attempt);
      continue;
    }

    if (res.status === 429 || res.status >= 500) {
      lastStatus = res.status;
      if (attempt === retries)
        throw new Error(
          `raydium upstream ${res.status} after ${retries} retries`
        );
      await sleep(baseMs * 2 ** attempt);
      continue;
    }
    if (!res.ok) {
      throw new Error(`raydium upstream ${res.status}`);
    }

    const body = (await res.json()) as any;
    return extractPage(body);
  }
  throw new Error(
    `raydium upstream ${lastStatus} exhausted retries (should be unreachable)`
  );
}

/** Pull the pool array + opaque cursor out of either envelope shape. */
function extractPage(body: any): RaydiumListPage {
  const root = body?.data;
  let data: unknown[];
  let nextPageId: string | number | null;
  if (Array.isArray(root)) {
    data = root;
    nextPageId = body?.nextPageId ?? null;
  } else {
    data = root?.data ?? root?.pools ?? [];
    nextPageId = root?.nextPageId ?? body?.nextPageId ?? null;
  }
  return {
    data: Array.isArray(data) ? data : [],
    nextPageId: nextPageId ?? null,
  };
}

/**
 * Full Raydium sync tick: paginate to completion via `nextPageId`, normalize +
 * floor each pool, idempotently upsert, then drain stale rows. Returns counts.
 */
export async function raydiumSync(
  opts: RaydiumSyncOptions = {}
): Promise<RaydiumSyncResult> {
  const db = getSyncDb();
  const now = new Date();
  const floor = floorOf(opts);
  const drainWindow = opts.drainWindowMs ?? DEFAULT_DRAIN_WINDOW_MS;

  const rows: NewPool[] = [];
  let nextPageId: string | number | null | undefined = undefined;
  let pages = 0;

  // Hard ceiling on pages guards against a misbehaving cursor loop.
  for (let i = 0; i < 100; i++) {
    const page = await fetchRaydiumPage({ ...opts, nextPageId });
    pages++;
    for (const raw of page.data) {
      const row = normalizeRaydiumPool(raw, floor, now);
      if (row) rows.push(row);
    }
    nextPageId = page.nextPageId;
    if (nextPageId === null || nextPageId === undefined) break;
  }

  await upsertPools(db, rows);
  const drained = await drainStalePools(
    db,
    "raydium",
    new Date(now.getTime() - drainWindow)
  );

  return { upserted: rows.length, drained, pages };
}
