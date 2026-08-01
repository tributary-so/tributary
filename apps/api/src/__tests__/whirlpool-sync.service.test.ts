/**
 * Unit tests for the Orca Whirlpool normalizer (POOL-API §6.2).
 *
 * The Orca /v1/whirlpools endpoint returns the full list in one shot (~17MB,
 * ignores limit/offset) and its origin has been intermittently CF-1016; the
 * exact field shape is therefore read DEFENSIVELY (multiple fallback names +
 * envelope shapes), exactly like Raydium/Meteora. These pin: field
 * normalization (defensive reads), the floor binding only on explicit TVL,
 * the flat-list response, idempotent upsert + drain, and 429/5xx backoff.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.mock("../db/pools", () => ({
  upsertPools: jest.fn(async () => undefined),
  drainStalePools: jest.fn(async () => 0),
}));

jest.mock("../services/pools-sync", () => ({
  getSyncDb: jest.fn(() => ({})),
  registerPoolNormalizer: jest.fn(),
  startPoolsSync: jest.fn(),
  stopPoolsSync: jest.fn(),
  runPoolsSyncTick: jest.fn(),
}));

import {
  normalizeWhirlpoolPool,
  fetchWhirlpoolPools,
  whirlpoolSync,
} from "../services/whirlpool-sync";
import * as poolsDb from "../db/pools";

const upsertPools = poolsDb.upsertPools as jest.MockedFunction<
  typeof poolsDb.upsertPools
>;
const drainStalePools = poolsDb.drainStalePools as jest.MockedFunction<
  typeof poolsDb.drainStalePools
>;

const NOW = new Date("2026-07-30T00:00:00Z");
const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function rawPool(overrides: Record<string, any> = {}) {
  return {
    whirlpoolAddress: "Whirl1",
    tokenA: { mint: SOL, symbol: "SOL", decimals: 9 },
    tokenB: { mint: USDC, symbol: "USDC", decimals: 6 },
    feeRate: 300,
    tickSpacing: 64,
    tvl: 5_000_000,
    ...overrides,
  };
}

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function fetchMock(): jest.MockedFunction<typeof fetch> {
  return jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
}

describe("normalizeWhirlpoolPool", () => {
  it("maps the tokenA/tokenB fields onto a pools row", () => {
    const row = normalizeWhirlpoolPool(rawPool(), 1000, NOW);
    expect(row).toMatchObject({
      address: "Whirl1",
      venue: "whirlpool",
      mintA: SOL,
      mintB: USDC,
      symbolA: "SOL",
      symbolB: "USDC",
      tvl: "5000000",
      feeRate: "300",
      refreshedAt: NOW,
    });
    expect(row?.extras).toEqual({ tickSpacing: 64 });
  });

  it("drops pools below the TVL floor when TVL is explicit", () => {
    expect(normalizeWhirlpoolPool(rawPool({ tvl: 500 }), 1000, NOW)).toBeNull();
    expect(
      normalizeWhirlpoolPool(rawPool({ tvl: 1000 }), 1000, NOW)
    ).not.toBeNull();
  });

  it("KEEPS pools with unknown TVL (floor only binds on explicit TVL)", () => {
    // ponytail: Orca REST may omit a clean USD TVL; dropping everything would
    // defeat the normalizer. Stars still rank; floor is best-effort.
    const row = normalizeWhirlpoolPool(
      rawPool({ tvl: undefined, liquidity: undefined }),
      1000,
      NOW
    );
    expect(row).not.toBeNull();
    expect(row?.tvl).toBe("0");
  });

  it("drops pools missing a usable identity (address or either mint)", () => {
    expect(
      normalizeWhirlpoolPool(
        rawPool({ whirlpoolAddress: undefined }),
        1000,
        NOW
      )
    ).toBeNull();
    expect(
      normalizeWhirlpoolPool(
        rawPool({ tokenA: undefined, mint_a: undefined }),
        1000,
        NOW
      )
    ).toBeNull();
    expect(
      normalizeWhirlpoolPool(
        rawPool({ tokenB: undefined, mint_b: undefined }),
        1000,
        NOW
      )
    ).toBeNull();
  });

  it("reads flat mint_a/b + symbol_a/b when tokenA/tokenB absent", () => {
    const row = normalizeWhirlpoolPool(
      rawPool({
        whirlpoolAddress: "Alt",
        tokenA: undefined,
        tokenB: undefined,
        mint_a: SOL,
        mint_b: USDC,
        symbol_a: "SOL",
        symbol_b: "USDC",
      }),
      1000,
      NOW
    );
    expect(row?.mintA).toBe(SOL);
    expect(row?.symbolB).toBe("USDC");
  });
});

describe("fetchWhirlpoolPools", () => {
  it("hits /v1/whirlpools and returns the flat array (no pagination)", async () => {
    const fetchImpl = fetchMock().mockResolvedValue(
      makeResponse([rawPool(), rawPool({ whirlpoolAddress: "W2" })])
    );

    const pools = await fetchWhirlpoolPools({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "https://example.test",
    });

    const calledUrl = fetchImpl.mock.calls[0][0] as string;
    expect(calledUrl).toBe("https://example.test/v1/whirlpools");
    expect(pools).toHaveLength(2);
  });

  it("tolerates {data:{whirlpools:[...]}} and {whirlpools:[...]} envelopes", async () => {
    const fetchImpl = fetchMock()
      .mockResolvedValueOnce(
        makeResponse({ data: { whirlpools: [rawPool()] } })
      )
      .mockResolvedValueOnce(makeResponse({ whirlpools: [rawPool()] }));

    const a = await fetchWhirlpoolPools({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "https://example.test",
    });
    const b = await fetchWhirlpoolPools({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "https://example.test",
    });
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });

  it("retries 429 with exponential backoff, then succeeds", async () => {
    const fetchImpl = fetchMock()
      .mockResolvedValueOnce(makeResponse({}, 429))
      .mockResolvedValueOnce(makeResponse([]));

    const pools = await fetchWhirlpoolPools({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "https://example.test",
      retries: 3,
      backoffBaseMs: 1,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(pools).toEqual([]);
  });

  it("throws after exhausting retries on persistent 5xx", async () => {
    const fetchImpl = fetchMock().mockResolvedValue(makeResponse({}, 503));

    await expect(
      fetchWhirlpoolPools({
        fetchImpl: fetchImpl as unknown as typeof fetch,
        baseUrl: "https://example.test",
        retries: 2,
        backoffBaseMs: 1,
      })
    ).rejects.toThrow(/503 after 2 retries/);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

describe("whirlpoolSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches the flat list, floors explicit-tvl pools, upserts, drains", async () => {
    const fetchImpl = fetchMock().mockResolvedValue(
      makeResponse([
        rawPool({ whirlpoolAddress: "W1", tvl: 5_000 }),
        rawPool({ whirlpoolAddress: "W2", tvl: 200 }), // below floor, explicit
        rawPool({ whirlpoolAddress: "W3", tvl: undefined }), // unknown → kept
      ])
    );

    const result = await whirlpoolSync({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "https://example.test",
      tvlFloor: 1000,
      backoffBaseMs: 1,
    });

    expect(result.upserted).toBe(2); // W1 + W3 (unknown TVL kept)
    expect(result.pages).toBe(1);

    expect(upsertPools).toHaveBeenCalledTimes(1);
    const upserted = upsertPools.mock.calls[0][1] as any[];
    expect(upserted.map((r) => r.address).sort()).toEqual(["W1", "W3"]);
    expect(upserted.every((r) => r.venue === "whirlpool")).toBe(true);

    expect(drainStalePools).toHaveBeenCalledTimes(1);
    const [, venue] = drainStalePools.mock.calls[0] as [unknown, string, Date];
    expect(venue).toBe("whirlpool");
  });
});
