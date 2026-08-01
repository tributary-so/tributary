/**
 * Unit tests for the Meteora live-proxy resolver (POOL-API §6.1).
 *
 * Fetch + resolveAsset are mocked (the Meteora API is unreachable from some
 * environments; the path/shape are isolated + env-overridable, tested here
 * against the attested `/pair/all_by_groups` nested-`groups` shape and the flat
 * fallback). Pins: query forwarding, defensive normalization, the inline
 * trust-join (stars = known(a)+known(b)), and isolation of per-mint failures.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.mock("../services/tokens-proxy", () => ({
  resolveAsset: jest.fn(),
}));

import {
  normalizeMeteoraPool,
  extractMeteoraPools,
  fetchMeteoraSearch,
  searchMeteoraLive,
} from "../services/meteora-resolver";
import * as tokensProxy from "../services/tokens-proxy";

const resolveAsset = tokensProxy.resolveAsset as jest.MockedFunction<
  typeof tokensProxy.resolveAsset
>;

const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SCAM = "Scam11111111111111111111111111111111111111111";

function rawPool(o: Record<string, any> = {}) {
  return {
    address: "Met1",
    mint_x: SOL,
    mint_y: USDC,
    name_x: "SOL",
    name_y: "USDC",
    decimals_x: 9,
    decimals_y: 6,
    tvl: 5_000_000,
    fee_percentage: 0.25,
    bin_step: 25,
    ...o,
  };
}

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function fetchMock() {
  return jest.fn() as unknown as jest.MockedFunction<typeof fetch>;
}

describe("normalizeMeteoraPool", () => {
  it("maps the pair fields onto a raw identity", () => {
    expect(normalizeMeteoraPool(rawPool())).toMatchObject({
      address: "Met1",
      mintA: SOL,
      mintB: USDC,
      symbolA: "SOL",
      symbolB: "USDC",
      tvl: 5_000_000,
      feeRate: 0.25,
      binStep: 25,
    });
  });

  it("drops entries missing a usable identity", () => {
    expect(normalizeMeteoraPool(rawPool({ address: undefined }))).toBeNull();
    expect(normalizeMeteoraPool(rawPool({ mint_x: undefined }))).toBeNull();
  });
});

describe("extractMeteoraPools", () => {
  it("flattens the groups:[{pools:[...]}] nested shape", () => {
    const body = {
      groups: [
        { pools: [rawPool()] },
        { pools: [rawPool({ address: "Met2" })] },
      ],
    };
    expect(extractMeteoraPools(body)).toHaveLength(2);
  });

  it("tolerates a flat array and {data:[...]} envelopes", () => {
    expect(extractMeteoraPools([rawPool()])).toHaveLength(1);
    expect(extractMeteoraPools({ data: [rawPool()] })).toHaveLength(1);
    expect(extractMeteoraPools({ rows: [rawPool()] })).toHaveLength(1);
  });
});

describe("fetchMeteoraSearch", () => {
  it("forwards search_term + sort params to the configured path", async () => {
    const f = fetchMock().mockResolvedValue(makeResponse([rawPool()]));
    await fetchMeteoraSearch("SOL", 5, {
      fetchImpl: f,
      baseUrl: "https://x.test",
      searchPath: "/pair/all_by_groups",
    });
    const url = f.mock.calls[0][0] as string;
    expect(url).toContain("https://x.test/pair/all_by_groups");
    expect(url).toContain("search_term=SOL");
    expect(url).toContain("sort_key=tvl");
    expect(url).toContain("page_size=5");
  });

  it("retries 429 once then succeeds", async () => {
    const f = fetchMock()
      .mockResolvedValueOnce(makeResponse({}, 429))
      .mockResolvedValueOnce(makeResponse([]));
    const out = await fetchMeteoraSearch("SOL", 5, {
      fetchImpl: f,
      baseUrl: "https://x.test",
    });
    expect(f).toHaveBeenCalledTimes(2);
    expect(out).toEqual([]);
  });

  it("throws on a persistent 5xx", async () => {
    const f = fetchMock().mockResolvedValue(makeResponse({}, 503));
    await expect(
      fetchMeteoraSearch("SOL", 5, { fetchImpl: f, baseUrl: "https://x.test" })
    ).rejects.toThrow(/503/);
  });
});

describe("searchMeteoraLive", () => {
  beforeEach(() => {
    resolveAsset.mockReset();
  });

  it("trust-joins: stars = known(a)+known(b); tokenA/B carry identity", async () => {
    const f = fetchMock().mockResolvedValue(
      makeResponse({ groups: [{ pools: [rawPool()] }] })
    );
    resolveAsset
      .mockResolvedValueOnce({
        symbol: "SOL",
        tier: "tier1",
        decimals: 9,
        imageUrl: "u1",
      } as any)
      .mockResolvedValueOnce({
        symbol: "USDC",
        tier: "tier1",
        decimals: 6,
        imageUrl: "u2",
      } as any);

    const out = await searchMeteoraLive("SOL", { limit: 5, fetchImpl: f, baseUrl: "https://x.test", searchPath: "/pair/all_by_groups" });

    expect(out).toHaveLength(1);
    const hit = out[0];
    expect(hit.pool.venue).toBe("meteora");
    expect(hit.pool.stars).toBe(2); // both known
    expect(hit.pool.tier1).toBe(true);
    expect(hit.tokenA?.symbol).toBe("SOL");
    expect(hit.tokenB?.logoUri).toBe("u2");
    expect(hit.pool.extras).toEqual({ binStep: 25 });
  });

  it("isolates a per-mint resolveAsset failure (unknown leg → 0★ contribution)", async () => {
    const f = fetchMock().mockResolvedValue(
      makeResponse({ groups: [{ pools: [rawPool({ mint_y: SCAM })] }] })
    );
    resolveAsset
      .mockResolvedValueOnce({ symbol: "SOL", tier: "tier1" } as any) // SOL ok
      .mockRejectedValueOnce(new Error("boom")); // SCAM resolve fails

    const out = await searchMeteoraLive("SOL", { limit: 5, fetchImpl: f, baseUrl: "https://x.test", searchPath: "/pair/all_by_groups" });

    expect(out).toHaveLength(1);
    expect(out[0].pool.stars).toBe(1); // only SOL known; SCAM failure → not known
    expect(out[0].tokenB).toBeNull();
  });

  it("returns [] when upstream matches nothing (empty-not-500 upstream of route)", async () => {
    const f = fetchMock().mockResolvedValue(makeResponse({ groups: [] }));
    resolveAsset.mockResolvedValue(null);

    const out = await searchMeteoraLive("NOPE", { limit: 5, fetchImpl: f, baseUrl: "https://x.test" });
    expect(out).toEqual([]);
    expect(resolveAsset).not.toHaveBeenCalled(); // no identities → no trust-join
  });

  it("dedupes mints across pools before the trust-join", async () => {
    // Two pools sharing SOL → SOL resolved once.
    const f = fetchMock().mockResolvedValue(
      makeResponse({
        groups: [
          {
            pools: [
              rawPool({ address: "A" }),
              rawPool({ address: "B", mint_y: SCAM }),
            ],
          },
        ],
      })
    );
    resolveAsset
      .mockResolvedValueOnce({ symbol: "SOL", tier: "tier1" } as any) // SOL (once)
      .mockResolvedValueOnce({ symbol: "USDC" } as any) // USDC
      .mockResolvedValueOnce(null); // SCAM (uncurated)

    await searchMeteoraLive("SOL", { limit: 5, fetchImpl: f, baseUrl: "https://x.test", searchPath: "/pair/all_by_groups" });

    // 3 unique mints (SOL, USDC, SCAM) → 3 resolveAsset calls, not 4.
    expect(resolveAsset).toHaveBeenCalledTimes(3);
  });
});
