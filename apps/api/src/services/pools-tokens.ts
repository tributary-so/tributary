/**
 * Pools token refresh + star precompute (bean tributary-podi).
 *
 * REUSES apps/api's existing tokens.xyz upstream client (`services/tokens-proxy.ts`)
 * — same service now (milestone REWRITTEN SCOPE), not a new client.
 *
 * Each sync tick (after venue normalizers upsert pools): gather the distinct
 * mints in the `pools` index whose `tokens` row is missing or stale, resolve
 * them via `resolveAsset`, write a `tokens` row (known + identity + tier), then
 * recompute stars/tier1 for the pools touching each mint (HANDOFF §4).
 *
 * tokens.xyz is a trust/RANKING layer, NEVER a gate: an uncurated mint resolves
 * to a synthetic identity with `known=false` and still ranks (just at 0 stars).
 * Writes go through the dedicated sync pool (`getSyncDb`).
 *
 * Registered as a post-sync hook in pools-sync (runs after venue normalizers).
 */

import {
  getMintsNeedingRefresh,
  recomputeStarsForMint,
  upsertToken,
} from "../db/pools";
import { getSyncDb } from "./pools-sync";
import { resolveAsset } from "./tokens-proxy";
import { describeError } from "./errors";

const STALE_MS = 60 * 60 * 1000; // refresh mints whose token row is >1h old
const PER_TICK = 200; // bound the tick — tokens-proxy Redis-caches resolve (10m)
const CONCURRENCY = 5;

export interface RefreshPoolsTokensOptions {
  maxAgeMs?: number;
  limit?: number;
  concurrency?: number;
}

/** Map over `items` with a fixed concurrency window. */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    out.push(...(await Promise.all(items.slice(i, i + concurrency).map(fn))));
  }
  return out;
}

/**
 * Refresh stale pooled mints from tokens.xyz + recompute affected pools' stars.
 * Per-mint failures are isolated (logged + skipped) so one bad mint never aborts
 * the whole refresh. Returns how many mints were refreshed.
 */
export async function refreshPoolsTokens(
  opts: RefreshPoolsTokensOptions = {}
): Promise<{ refreshed: number }> {
  const db = getSyncDb();
  const now = new Date();

  const mints = await getMintsNeedingRefresh(db, {
    maxAgeMs: opts.maxAgeMs ?? STALE_MS,
    limit: opts.limit ?? PER_TICK,
  });
  if (mints.length === 0) return { refreshed: 0 };

  let refreshed = 0;
  await mapWithConcurrency(
    mints,
    opts.concurrency ?? CONCURRENCY,
    async (mint) => {
      try {
        const asset = await resolveAsset(mint);
        await upsertToken(db, {
          mint,
          // known = curated by tokens.xyz (tier1/tier2). tier3 singletons
          // (tokens.xyz synthesised a placeholder) rank via their tier but
          // don't get the +1 star boost — without this gate, every resolved
          // mint scores stars=2 and the ranking flattens. Overrides (USDC,
          // SOL, …) carry no tier → `undefined !== "tier3"` → known=true.
          known: asset != null && asset.tier !== "tier3",
          tier: asset?.tier ?? null,
          symbol: asset?.symbol ?? null,
          name: asset?.name ?? null,
          decimals: asset?.decimals ?? null,
          logoUri: asset?.imageUrl ?? null,
          refreshedAt: now,
        });
        await recomputeStarsForMint(db, mint);
        refreshed++;
      } catch (err) {
        console.warn(
          `[pools-tokens] refresh failed for ${mint}:`,
          describeError(err)
        );
      }
    }
  );

  return { refreshed };
}
