/**
 * Unit tests for the Raydium CLMM normalizer (bean tributary-jh0p).
 *
 * Fetch is mocked (no live Raydium — and Raydium has no free-text upstream, so
 * the index is the feature). The DB layer (getSyncDb / upsertPools /
 * drainStalePools) is mocked at the module boundary. These pin the contract:
 * field normalization, TVL floor drop, opaque-cursor pagination, idempotent
 * upsert + drain, and 429/5xx exponential backoff.
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
  normalizeRaydiumPool,
  fetchRaydiumPage,
  raydiumSync,
} from "../services/raydium-sync";
import * as poolsDb from "../db/pools";

const upsertPools = poolsDb.upsertPools as jest.MockedFunction<
  typeof poolsDb.upsertPools
>;
const drainStalePools = poolsDb.drainStalePools as jest.MockedFunction<
  typeof poolsDb.drainStalePools
>;

const NOW = new Date("2026-07-30T00:00:00Z");

function rawPool(overrides: Record<string, any> = {}) {
  return {
    id: "PoolAddr1",
    ammConfig: { id: "cfgA", index: 1, tradeFeeRate: 100, tickSpacing: 1 },
    mintA: {
      address: "So11111111111111111111111111111111111111112",
      decimals: 9,
      symbol: "SOL",
    },
    mintB: {
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      decimals: 6,
      symbol: "USDC",
    },
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

// Typed so .mockResolvedValueOnce(Response) type-checks (untyped jest.fn()
// infers `never` and rejects the Response payload).
function fetchMock(): jest.MockedFunction<typeof fetch> {
  return jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
}

describe("normalizeRaydiumPool", () => {
  it("maps the documented Raydium v3 fields onto a pools row", () => {
    const row = normalizeRaydiumPool(rawPool(), 1000, NOW);
    expect(row).toMatchObject({
      address: "PoolAddr1",
      venue: "raydium",
      mintA: "So11111111111111111111111111111111111111112",
      mintB: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      symbolA: "SOL",
      symbolB: "USDC",
      tvl: "5000000",
      feeRate: "100",
      refreshedAt: NOW,
    });
    expect(row?.extras).toEqual({
      ammConfig: { id: "cfgA", index: 1, tradeFeeRate: 100, tickSpacing: 1 },
    });
  });

  it("drops pools below the TVL floor (perf/dust cut, not trust)", () => {
    expect(normalizeRaydiumPool(rawPool({ tvl: 999 }), 1000, NOW)).toBeNull();
    expect(
      normalizeRaydiumPool(rawPool({ tvl: 1000 }), 1000, NOW)
    ).not.toBeNull();
  });

  it("drops pools missing a usable identity (address or either mint)", () => {
    expect(
      normalizeRaydiumPool(rawPool({ id: undefined }), 1000, NOW)
    ).toBeNull();
    expect(
      normalizeRaydiumPool(
        rawPool({ mintA: { address: undefined } }),
        1000,
        NOW
      )
    ).toBeNull();
    expect(
      normalizeRaydiumPool(
        rawPool({ mintB: { address: undefined } }),
        1000,
        NOW
      )
    ).toBeNull();
  });

  it("treats a missing TVL as 0 (below floor → dropped)", () => {
    expect(
      normalizeRaydiumPool(rawPool({ tvl: undefined }), 1000, NOW)
    ).toBeNull();
  });
});

describe("fetchRaydiumPage", () => {
  it("builds the cursor query with poolType/sortType/size and returns data + nextPageId", async () => {
    const fetchImpl = fetchMock().mockResolvedValue(
      makeResponse({
        success: true,
        data: { data: [rawPool()], nextPageId: 42 },
      })
    );

    const page = await fetchRaydiumPage({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "https://example.test",
      pageSize: 50,
    });

    const calledUrl = fetchImpl.mock.calls[0][0] as string;
    expect(calledUrl).toContain("https://example.test/pools/info/list-v2");
    expect(calledUrl).toContain("poolType=concentrated");
    expect(calledUrl).toContain("sortType=desc");
    expect(calledUrl).toContain("size=50");
    expect(calledUrl).not.toContain("nextPageId"); // first page: no cursor

    expect(page.data).toHaveLength(1);
    expect(page.nextPageId).toBe(42);
  });

  it("appends the opaque nextPageId cursor on follow-up pages", async () => {
    const fetchImpl = fetchMock().mockResolvedValue(
      makeResponse({ data: { data: [], nextPageId: null } })
    );

    await fetchRaydiumPage({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "https://example.test",
      nextPageId: 42,
    });

    expect(fetchImpl.mock.calls[0][0] as string).toContain("nextPageId=42");
  });

  it("retries 429 with exponential backoff, then succeeds", async () => {
    const fetchImpl = fetchMock()
      .mockResolvedValueOnce(makeResponse({}, 429))
      .mockResolvedValueOnce(
        makeResponse({ data: { data: [], nextPageId: null } })
      );

    const page = await fetchRaydiumPage({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "https://example.test",
      retries: 3,
      backoffBaseMs: 1,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(page.data).toEqual([]);
  });

  it("throws after exhausting retries on persistent 5xx", async () => {
    const fetchImpl = fetchMock().mockResolvedValue(makeResponse({}, 503));

    await expect(
      fetchRaydiumPage({
        fetchImpl: fetchImpl as unknown as typeof fetch,
        baseUrl: "https://example.test",
        retries: 2,
        backoffBaseMs: 1,
      })
    ).rejects.toThrow(/503 after 2 retries/);
    expect(fetchImpl).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("throws immediately on a non-retryable error status (no backoff)", async () => {
    const fetchImpl = fetchMock().mockResolvedValue(makeResponse({}, 404));

    await expect(
      fetchRaydiumPage({
        fetchImpl: fetchImpl as unknown as typeof fetch,
        baseUrl: "https://example.test",
        retries: 3,
        backoffBaseMs: 1,
      })
    ).rejects.toThrow(/404/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("raydiumSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("paginates to completion, floors, upserts survivors, and drains stale", async () => {
    // page 1: 2 pools (one above floor, one below) + a cursor; page 2: 1 pool, no cursor.
    const fetchImpl = fetchMock()
      .mockResolvedValueOnce(
        makeResponse({
          data: {
            data: [
              rawPool({ id: "P1", tvl: 5_000 }),
              rawPool({ id: "P2", tvl: 200 }),
            ],
            nextPageId: "cur",
          },
        })
      )
      .mockResolvedValueOnce(
        makeResponse({
          data: {
            data: [rawPool({ id: "P3", tvl: 50_000 })],
            nextPageId: null,
          },
        })
      );

    const result = await raydiumSync({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "https://example.test",
      tvlFloor: 1000,
      backoffBaseMs: 1,
    });

    expect(result.pages).toBe(2);
    expect(result.upserted).toBe(2); // P2 (tvl 200) dropped by the floor

    expect(upsertPools).toHaveBeenCalledTimes(1);
    const upserted = upsertPools.mock.calls[0][1] as any[];
    expect(upserted.map((r) => r.address).sort()).toEqual(["P1", "P3"]);
    expect(upserted.every((r) => r.venue === "raydium")).toBe(true);

    // drain was called with a cutoff windowed into the past, for raydium.
    expect(drainStalePools).toHaveBeenCalledTimes(1);
    const [, venue, cutoff] = drainStalePools.mock.calls[0] as [
      unknown,
      string,
      Date
    ];
    expect(venue).toBe("raydium");
    expect(cutoff.getTime()).toBeLessThan(Date.now()); // windowed into the past
  });

  it("upserts an empty batch when every pool is below the floor (no crash)", async () => {
    const fetchImpl = fetchMock().mockResolvedValueOnce(
      makeResponse({
        data: { data: [rawPool({ id: "Dust", tvl: 5 })], nextPageId: null },
      })
    );

    const result = await raydiumSync({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "https://example.test",
      tvlFloor: 1000,
    });

    expect(result.upserted).toBe(0);
    expect(upsertPools).toHaveBeenCalledWith(expect.anything(), []);
  });
});
