/**
 * PoolPicker — venue-agnostic presentational pool picker for the Tributary
 * /v1/pools/search endpoint. Consumes usePoolSearch results (or any
 * PoolSearchResult[]) and renders normalized rows — pair symbols + logos +
 * TVL + fee + stars/tier1 badge — emitting the uniform onSelect contract
 * (pool, srcMint, tgtMint, extras, srcMeta, tgtMeta). ONE shell for all
 * venues; the venue difference lives server-side. See bean tributary-i2nd
 * and milestone tributary-gq0p HANDOFF §1.5.
 *
 * Dependency-light by design: no HeroUI, no Mill internals. Mill embeds
 * <PoolRow/> inside its own AutocompleteItem (replacing the two per-venue
 * clones), and the pure helpers here supersede Mill's duplicated
 * pool-direction.ts. Keys never reach the browser; failure stance is
 * empty-not-500 (the hook already returns [] on error).
 */

import type { ReactNode } from "react";

import type { PoolSearchResult, TokenTier } from "./types";

// ── Direction + onSelect contract ──────────────────────────────────────────

export type Direction = "tokenX" | "tokenY";

/** Identity + trust metadata for one pool leg, emitted on select. */
export interface PoolLegMeta {
  mint: string;
  symbol: string;
  decimals: number;
  logoUri: string | null;
  tier: TokenTier;
}

/**
 * Uniform onSelect (milestone HANDOFF §1.5):
 *   onSelect(pool, srcMint, tgtMint, extras, srcMeta, tgtMeta)
 * `extras` carries venue-specific side channels the server populates (e.g.
 * Raydium's ammConfig); the client never branches on venue — that drift is
 * exactly what this type kills (see sibling bean tributary-yk1m).
 */
export type PoolSelectHandler = (
  pool: string,
  srcMint: string,
  tgtMint: string,
  extras: Record<string, unknown> | null,
  srcMeta: PoolLegMeta,
  tgtMeta: PoolLegMeta
) => void;

// Curated stablecoin mints for the implied (display) direction —
// swap-to-stable accumulates the stable side. Mirrored from @mill/catalog;
// the server-side normalizer is the real trust authority, this is a UX hint.
export const STABLE_MINTS = new Set([
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr", // EURC
]);

function legMeta(token: PoolSearchResult["tokenX"]): PoolLegMeta {
  return {
    mint: token.mint,
    // Unknown symbol → first 4 mint chars so the row never goes blank.
    symbol: token.symbol ?? token.mint.slice(0, 4),
    // ponytail: decimals default 6 (SPL-ish) when the index lacks it.
    decimals: token.decimals ?? 6,
    logoUri: token.logoUri,
    tier: token.tier,
  };
}

/**
 * Resolve source/target legs from a pool + direction.
 * "Accumulate tokenX" (dir="tokenX") → targetMint = tokenX, sourceMint =
 * tokenY (you pay tokenY to accumulate tokenX). Mirrors Mill's prior
 * resolveDirection semantics so the migration is a drop-in.
 */
export function resolvePoolDirection(
  pool: PoolSearchResult,
  direction: Direction
): {
  srcMint: string;
  tgtMint: string;
  srcMeta: PoolLegMeta;
  tgtMeta: PoolLegMeta;
} {
  const targetIsX = direction === "tokenX";
  const src = targetIsX ? pool.tokenY : pool.tokenX;
  const tgt = targetIsX ? pool.tokenX : pool.tokenY;
  return {
    srcMint: src.mint,
    tgtMint: tgt.mint,
    srcMeta: legMeta(src),
    tgtMeta: legMeta(tgt),
  };
}

/**
 * Implied direction for swap-to-stable: accumulate the stable side. Both or
 * neither stable → tokenY (lexicographic default). Display-only — a user
 * direction toggle (Mill shell) is authoritative when present.
 */
export function impliedPoolDirection(
  pool: PoolSearchResult,
  stableMints: Set<string> = STABLE_MINTS
): Direction {
  const xStable = stableMints.has(pool.tokenX.mint);
  const yStable = stableMints.has(pool.tokenY.mint);
  return xStable && !yStable ? "tokenX" : "tokenY";
}

/** Emit the uniform onSelect for a pool + direction (row handler in one line). */
export function selectPool(
  pool: PoolSearchResult,
  direction: Direction,
  onSelect: PoolSelectHandler
): void {
  const r = resolvePoolDirection(pool, direction);
  onSelect(
    pool.address,
    r.srcMint,
    r.tgtMint,
    pool.extras,
    r.srcMeta,
    r.tgtMeta
  );
}

// ── Formatting ─────────────────────────────────────────────────────────────

/** Compact USD TVL: $1.2B / $3.4M / $12K / $500. null/undefined → em dash. */
export function formatTvl(tvl: number | null | undefined): string {
  if (tvl == null) return "—";
  if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(1)}B`;
  if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(1)}M`;
  if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(0)}K`;
  return `$${tvl.toFixed(0)}`;
}

/**
 * Format a fee rate. `feeRate` is a FRACTION (0.0025 → "0.25%"). The
 * server-side normalizer owns converting each venue's native unit to a
 * fraction so the client never branches on venue. null → em dash.
 */
export function formatFee(feeRate: number | null | undefined): string {
  if (feeRate == null) return "—";
  return `${(feeRate * 100).toFixed(2)}%`;
}

/** Star glyph string for a pool's precomputed trust stars (clamped 0|1|2). */
export function starGlyph(stars: number): string {
  return "★".repeat(Math.max(0, Math.min(2, stars)));
}

// ── Components ─────────────────────────────────────────────────────────────

export interface PoolRowProps {
  pool: PoolSearchResult;
  selected?: boolean;
  className?: string;
}

/**
 * Canonical row content: token logos + pair symbols, then a stars/tier1
 * trust badge, TVL, and fee. The consumer embeds this inside whichever list
 * shell it uses (HeroUI AutocompleteItem in Mill; a plain <li> in
 * PoolResultsList). NOT a button itself — selection is owned by the shell.
 */
export function PoolRow({ pool, selected, className }: PoolRowProps) {
  return (
    <div
      className={`flex items-center gap-2 w-full min-w-0 ${className ?? ""}`}
    >
      <PairLogos
        xUri={pool.tokenX.logoUri}
        yUri={pool.tokenY.logoUri}
        xSym={pool.tokenX.symbol}
        ySym={pool.tokenY.symbol}
      />
      <span className="text-sm truncate flex-1 min-w-0">
        {pool.tokenX.symbol ?? pool.tokenX.mint.slice(0, 4)}
        {" / "}
        {pool.tokenY.symbol ?? pool.tokenY.mint.slice(0, 4)}
      </span>
      <TrustBadge stars={pool.stars} tier1={pool.tier1} />
      <span className="text-xs text-muted-foreground shrink-0 font-mono tabular-nums">
        {formatTvl(pool.tvl)} · {formatFee(pool.feeRate)}
      </span>
      {selected && (
        <span aria-hidden="true" className="text-primary shrink-0">
          ✓
        </span>
      )}
    </div>
  );
}

export interface PoolResultsListProps {
  results: PoolSearchResult[];
  onSelect: PoolSelectHandler;
  /** Currently-selected pool address (controls the ✓ + aria-selected). */
  selectedAddress?: string | null;
  /** Direction assumed on row click. Default: impliedPoolDirection. */
  direction?: Direction | ((pool: PoolSearchResult) => Direction);
  /** Override the row renderer (e.g. inject a different shell). */
  renderRow?: (pool: PoolSearchResult, selected: boolean) => ReactNode;
  emptyLabel?: string;
  className?: string;
  rowClassName?: string;
}

/**
 * Standalone ranked pool list (no HeroUI). Renders one <PoolRow/> per result
 * as a listbox; clicking a row emits the uniform onSelect with the chosen
 * direction (implied by default). Use this directly in simple consumers, or
 * embed <PoolRow/> in your own Autocomplete shell for HeroUI apps.
 */
export function PoolResultsList({
  results,
  onSelect,
  selectedAddress,
  direction = impliedPoolDirection,
  renderRow,
  emptyLabel = "No pools found",
  className,
  rowClassName,
}: PoolResultsListProps) {
  if (results.length === 0) {
    return <p className="text-xs text-muted-foreground/70">{emptyLabel}</p>;
  }
  const dirFn: (p: PoolSearchResult) => Direction =
    typeof direction === "function" ? direction : () => direction;
  return (
    <ul className={className} role="listbox" aria-label="Pools">
      {results.map((pool) => {
        const selected = !!selectedAddress && selectedAddress === pool.address;
        return (
          <li
            key={pool.address}
            role="option"
            aria-selected={selected}
            className={rowClassName}
          >
            <button
              type="button"
              className="w-full text-left"
              onClick={() => selectPool(pool, dirFn(pool), onSelect)}
            >
              {renderRow ? (
                renderRow(pool, selected)
              ) : (
                <PoolRow pool={pool} selected={selected} />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Internal sub-components ────────────────────────────────────────────────

function PairLogos({
  xUri,
  yUri,
  xSym,
  ySym,
}: {
  xUri: string | null;
  yUri: string | null;
  xSym: string | null;
  ySym: string | null;
}) {
  return (
    <span className="flex items-center -space-x-1.5 shrink-0">
      <Avatar src={xUri} sym={xSym} />
      <Avatar src={yUri} sym={ySym} />
    </span>
  );
}

function Avatar({ src, sym }: { src: string | null; sym: string | null }) {
  if (!src) {
    return (
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] text-muted-foreground border border-border/50"
        aria-hidden="true"
      >
        {(sym ?? "?").slice(0, 1)}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="h-5 w-5 rounded-full border border-border/50 object-cover bg-muted"
    />
  );
}

function TrustBadge({ stars, tier1 }: { stars: number; tier1: boolean }) {
  if (!stars && !tier1) return null;
  return (
    <span className="flex items-center gap-1 shrink-0">
      {stars > 0 && (
        <span
          className="text-amber-500 text-xs leading-none"
          title={`${stars}/2 trusted legs`}
        >
          {starGlyph(stars)}
        </span>
      )}
      {tier1 && (
        <span
          className="text-[10px] leading-none px-1 border border-border/50 text-muted-foreground"
          title="contains a tier-1 token"
        >
          T1
        </span>
      )}
    </span>
  );
}
