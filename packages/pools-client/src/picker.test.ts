/**
 * Ponytail self-check for the PoolPicker pure helpers. Run with:
 *   npx tsx src/picker.test.ts
 *
 * Exercises the uniform onSelect contract, direction resolution, the
 * swap-to-stable implied direction, formatting, and the star clamp — the
 * logic Mill's two clones + pool-direction.ts previously duplicated. No DOM
 * render here (react.test.ts covers the hook); these are pure functions.
 */

import {
  STABLE_MINTS,
  formatFee,
  formatTvl,
  impliedPoolDirection,
  resolvePoolDirection,
  selectPool,
  starGlyph,
  type PoolSelectHandler,
} from "./picker";
import type { PoolSearchResult } from "./types";

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL = "So11111111111111111111111111111111111111112";
const SCAM = "Scam1111111111111111111111111111111111111111";

function pool(overrides: Partial<PoolSearchResult> = {}): PoolSearchResult {
  return {
    address: "PoolAddr111111111111111111111111111111111111",
    venue: "raydium",
    token_x: {
      mint: SOL,
      symbol: "SOL",
      decimals: 9,
      logo_uri: null,
      tier: "tier1",
    },
    token_y: {
      mint: USDC,
      symbol: "USDC",
      decimals: 6,
      logo_uri: "https://x.test/usdc.png",
      tier: "tier1",
    },
    tvl: 1_200_000,
    feeRate: 0.0025,
    stars: 2,
    tier1: true,
    extras: { ammConfig: "AmmCfg11111111111111111111111111111111111" },
    ...overrides,
  };
}

function main(): void {
  const p = pool();

  // --- resolvePoolDirection: tokenX → target=token_x, source=token_y ---
  const xDir = resolvePoolDirection(p, "tokenX");
  assert(
    xDir.tgtMint === SOL,
    "tokenX direction: target should be token_x (SOL)",
  );
  assert(
    xDir.srcMint === USDC,
    "tokenX direction: source should be token_y (USDC)",
  );
  assert(xDir.srcMeta.symbol === "USDC", "srcMeta symbol");
  assert(xDir.tgtMeta.logoUri === null, "tgtMeta logo_uri passthrough");

  const yDir = resolvePoolDirection(p, "tokenY");
  assert(
    yDir.tgtMint === USDC,
    "tokenY direction: target should be token_y (USDC)",
  );
  assert(
    yDir.srcMint === SOL,
    "tokenY direction: source should be token_x (SOL)",
  );

  // --- legMeta fallbacks: unknown symbol/decimals never blank the row ---
  const unknown = pool({
    token_x: {
      mint: SCAM,
      symbol: null,
      decimals: null,
      logo_uri: null,
      tier: null,
    },
  });
  const unknownDir = resolvePoolDirection(unknown, "tokenX");
  assert(unknownDir.srcMeta.symbol === "USDC", "known leg still resolves");
  assert(
    unknownDir.tgtMeta.symbol === SCAM.slice(0, 4),
    "null symbol falls back to mint prefix",
  );
  assert(unknownDir.tgtMeta.decimals === 6, "null decimals default to 6");

  // --- impliedPoolDirection: swap-to-stable accumulates the stable side ---
  // SOL/USDC → USDC is the stable (token_y) → accumulate tokenY.
  assert(
    impliedPoolDirection(p) === "tokenY",
    "implied: accumulate the stable leg (USDC = tokenY)",
  );
  // Flip so stable is token_x → implied tokenX.
  const stableX = pool({
    token_x: {
      mint: USDC,
      symbol: "USDC",
      decimals: 6,
      logo_uri: null,
      tier: "tier1",
    },
    token_y: {
      mint: SOL,
      symbol: "SOL",
      decimals: 9,
      logo_uri: null,
      tier: "tier1",
    },
  });
  assert(
    impliedPoolDirection(stableX) === "tokenX",
    "implied: stable on token_x → tokenX",
  );
  // Neither stable → lexicographic default tokenY.
  const noStable = pool({
    token_x: {
      mint: SOL,
      symbol: "SOL",
      decimals: 9,
      logo_uri: null,
      tier: null,
    },
    token_y: {
      mint: SCAM,
      symbol: "SCAM",
      decimals: 9,
      logo_uri: null,
      tier: null,
    },
  });
  assert(
    impliedPoolDirection(noStable) === "tokenY",
    "no stable → tokenY default",
  );

  // --- STABLE_MINTS sanity (display hint set) ---
  assert(STABLE_MINTS.has(USDC), "USDC in stable set");

  // --- selectPool: emits the UNIFORM 6-arg positional contract ---
  let captured: Parameters<PoolSelectHandler> | null = null;
  const handler: PoolSelectHandler = (...args) => {
    captured = args;
  };
  selectPool(p, "tokenX", handler);
  assert(captured !== null, "selectPool invokes the handler");
  const [addr, srcMint, tgtMint, extras, srcMeta, tgtMeta] = captured!;
  assert(addr === p.address, "onSelect arg0 = pool address");
  assert(srcMint === USDC, "onSelect arg1 = srcMint (tokenX → token_y)");
  assert(tgtMint === SOL, "onSelect arg2 = tgtMint (tokenX → token_x)");
  assert(
    extras === p.extras,
    "onSelect arg3 = venue extras (ammConfig rides here, no client branch)",
  );
  assert(srcMeta.decimals === 6, "onSelect arg4 srcMeta.decimals");
  assert(tgtMeta.tier === "tier1", "onSelect arg5 tgtMeta.tier passthrough");

  // --- formatting ---
  assert(formatTvl(1.2e9) === "$1.2B", "formatTvl billions");
  assert(formatTvl(1_200_000) === "$1.2M", "formatTvl millions");
  assert(formatTvl(12_000) === "$12K", "formatTvl thousands");
  assert(formatTvl(500) === "$500", "formatTvl small");
  assert(formatTvl(null) === "—", "formatTvl null → em dash");
  assert(formatFee(0.0025) === "0.25%", "formatFee fraction → percent");
  assert(formatFee(null) === "—", "formatFee null → em dash");

  // --- star clamp ---
  assert(starGlyph(2) === "★★", "2 stars");
  assert(starGlyph(1) === "★", "1 star");
  assert(starGlyph(0) === "", "0 stars blank");
  assert(starGlyph(5) === "★★", "stars clamped to 2");

  console.log("OK — pools-client PoolPicker helper self-check passed");
}

main();
