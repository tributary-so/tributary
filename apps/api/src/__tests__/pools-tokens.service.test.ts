/**
 * Unit tests for the pools token refresh + star precompute (bean tributary-podi).
 *
 * tokens.xyz upstream (resolveAsset) + the data layer (getMintsNeedingRefresh /
 * upsertToken / recomputeStarsForMint) are mocked at the module boundary. These
 * pin: per-mint resolve → token row (known/identity/tier) → recompute, isolation
 * of per-mint failures, and the no-stale-mints fast path. tokens.xyz is a
 * ranking layer, never a gate (unknown mints still get a row with known=false).
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.mock("../services/tokens-proxy", () => ({
  resolveAsset: jest.fn(),
}));

jest.mock("../db/pools", () => ({
  getMintsNeedingRefresh: jest.fn(),
  upsertToken: jest.fn(async () => undefined),
  recomputeStarsForMint: jest.fn(async () => 0),
}));

jest.mock("../services/pools-sync", () => ({
  getSyncDb: jest.fn(() => ({})),
  registerPoolNormalizer: jest.fn(),
  registerPostSyncHook: jest.fn(),
  startPoolsSync: jest.fn(),
  stopPoolsSync: jest.fn(),
  runPoolsSyncTick: jest.fn(),
}));

import { refreshPoolsTokens } from "../services/pools-tokens";
import * as tokensProxy from "../services/tokens-proxy";
import * as poolsDb from "../db/pools";

const resolveAsset = tokensProxy.resolveAsset as jest.MockedFunction<
  typeof tokensProxy.resolveAsset
>;
const getMintsNeedingRefresh =
  poolsDb.getMintsNeedingRefresh as jest.MockedFunction<
    typeof poolsDb.getMintsNeedingRefresh
  >;
const upsertToken = poolsDb.upsertToken as jest.MockedFunction<
  typeof poolsDb.upsertToken
>;
const recomputeStarsForMint =
  poolsDb.recomputeStarsForMint as jest.MockedFunction<
    typeof poolsDb.recomputeStarsForMint
  >;

const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const UNKNOWN = "Unkn0wnMint0000000000000000000000000000000"; // placeholder mint

describe("refreshPoolsTokens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves each stale mint, writes a token row, and recomputes stars", async () => {
    getMintsNeedingRefresh.mockResolvedValue([SOL, USDC]);
    resolveAsset
      .mockResolvedValueOnce({
        mint: SOL,
        assetId: "sol",
        symbol: "SOL",
        name: "Wrapped SOL",
        decimals: 9,
        imageUrl: null,
        category: "native",
        tier: "tier1",
      })
      .mockResolvedValueOnce({
        mint: USDC,
        assetId: "usd",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        imageUrl: "https://img/usdc.png",
        category: "stablecoin",
        tier: "tier1",
      });

    const result = await refreshPoolsTokens();

    expect(result.refreshed).toBe(2);
    expect(resolveAsset).toHaveBeenCalledTimes(2);

    // upsertToken carries known + identity + tier, for each mint.
    expect(upsertToken).toHaveBeenCalledTimes(2);
    const solRow = upsertToken.mock.calls.find((c) => c[1].mint === SOL)![1];
    expect(solRow).toMatchObject({
      mint: SOL,
      known: true,
      tier: "tier1",
      symbol: "SOL",
      decimals: 9,
    });
    // recompute fires once per mint.
    expect(recomputeStarsForMint).toHaveBeenCalledTimes(2);
  });

  it("records an uncurated mint as known=false (trust is a ranking layer, not a gate)", async () => {
    getMintsNeedingRefresh.mockResolvedValue([UNKNOWN]);
    resolveAsset.mockResolvedValueOnce(null);

    const result = await refreshPoolsTokens();

    expect(result.refreshed).toBe(1);
    expect(upsertToken).toHaveBeenCalledWith(expect.anything(), {
      mint: UNKNOWN,
      known: false,
      tier: null,
      symbol: null,
      name: null,
      decimals: null,
      logoUri: null,
      refreshedAt: expect.any(Date),
    });
  });

  it("isolates per-mint failures: a throwing resolve never aborts the rest", async () => {
    getMintsNeedingRefresh.mockResolvedValue([SOL, UNKNOWN, USDC]);
    resolveAsset
      .mockResolvedValueOnce({
        mint: SOL,
        assetId: "sol",
        symbol: "SOL",
        name: "Wrapped SOL",
        decimals: 9,
        imageUrl: null,
        category: "native",
        tier: null,
      })
      .mockRejectedValueOnce(new Error("upstream 500")) // UNKNOWN fails
      .mockResolvedValueOnce({
        mint: USDC,
        assetId: "usd",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        imageUrl: null,
        category: "stablecoin",
        tier: null,
      });

    const result = await refreshPoolsTokens();

    // only the two that resolved are counted; the failed one is skipped, not fatal
    expect(result.refreshed).toBe(2);
    expect(upsertToken).toHaveBeenCalledTimes(2);
    expect(recomputeStarsForMint).toHaveBeenCalledTimes(2);
  });

  it("fast-paths to zero work when no mints are stale", async () => {
    getMintsNeedingRefresh.mockResolvedValue([]);

    const result = await refreshPoolsTokens();

    expect(result.refreshed).toBe(0);
    expect(resolveAsset).not.toHaveBeenCalled();
    expect(upsertToken).not.toHaveBeenCalled();
  });
});
