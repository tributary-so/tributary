/**
 * Unit tests for the Meteora live-proxy resolver (POOL-API §6.1).
 *
 * Fetch + resolveAsset are mocked (no network in CI). Pins: query forwarding
 * to the current `dlmm.datapi.meteora.ag/pools` contract (params: query,
 * sort_by=tvl:desc, filter_by=is_blacklisted=false), defensive normalization
 * across the new nested token_x/token_y/pool_config shape AND the retired
 * flat mint_x/fee_percentage shape (the cascade stays), the inline trust-join
 * (stars = known(a)+known(b)), and isolation of per-mint failures.
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

/**
 * Current dlmm.datapi.meteora.ag /pools entry shape: mints and metadata are
 * nested under token_x/token_y, bin_step under pool_config, fee is
 * dynamic_fee_pct. The normalizer reads this as the primary path.
 */
function rawPool(o: Record<string, any> = {}) {
  return {
    address: "Met1",
    name: "SOL-USDC",
    token_x: { address: SOL, symbol: "SOL", name: "SOL", decimals: 9 },
    token_y: { address: USDC, symbol: "USDC", name: "USDC", decimals: 6 },
    tvl: 5_000_000,
    dynamic_fee_pct: 0.25,
    pool_config: { bin_step: 25, base_fee_pct: 1.0 },
    is_blacklisted: false,
    ...o,
  };
}

/**
 * Retired /pair/all_by_groups shape (flat mint_x/name_x/fee_percentage/
 * bin_step at the top level). Kept so the defensive cascade is pinned — a
 * minor upstream shape regression shouldn't blank the resolver.
 */
function legacyRawPool(o: Record<string, any> = {}) {
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
  it("maps the current nested token_x/token_y/pool_config shape", () => {
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

  it("still tolerates the retired flat mint_x/fee_percentage shape (defensive cascade)", () => {
    expect(normalizeMeteoraPool(legacyRawPool())).toMatchObject({
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

  it("falls back to pool_config.base_fee_pct when dynamic_fee_pct is absent", () => {
    const p = rawPool({ dynamic_fee_pct: undefined });
    // base_fee_pct is 1.0 in the fixture → feeRate falls through to it.
    expect(normalizeMeteoraPool(p)?.feeRate).toBe(1.0);
  });

  it("drops entries missing a usable identity", () => {
    expect(normalizeMeteoraPool(rawPool({ address: undefined }))).toBeNull();
    expect(
      normalizeMeteoraPool(rawPool({ token_x: { address: undefined } }))
    ).toBeNull();
  });
});

describe("extractMeteoraPools", () => {
  it("reads the {data:[...]} envelope the current /pools endpoint returns", () => {
    expect(extractMeteoraPools({ data: [rawPool()] })).toHaveLength(1);
  });

  it("still flattens the retired groups:[{pools:[...]}] nested shape", () => {
    const body = {
      groups: [
        { pools: [rawPool()] },
        { pools: [rawPool({ address: "Met2" })] },
      ],
    };
    expect(extractMeteoraPools(body)).toHaveLength(2);
  });

  it("tolerates a flat array and {rows:[...]} envelopes", () => {
    expect(extractMeteoraPools([rawPool()])).toHaveLength(1);
    expect(extractMeteoraPools({ rows: [rawPool()] })).toHaveLength(1);
  });
});

describe("fetchMeteoraSearch", () => {
  it("forwards the current /pools contract: query, sort_by=tvl:desc, filter_by, page, page_size", async () => {
    const f = fetchMock().mockResolvedValue(
      makeResponse({ data: [rawPool()] })
    );
    await fetchMeteoraSearch("SOL", 5, {
      fetchImpl: f,
      baseUrl: "https://x.test",
      searchPath: "/pools",
    });
    const url = f.mock.calls[0][0] as string;
    expect(url).toContain("https://x.test/pools");
    expect(url).toContain("query=SOL");
    expect(url).toContain("sort_by=tvl%3Adesc"); // colon encoded
    expect(url).toContain("filter_by=is_blacklisted%3Dfalse");
    expect(url).toContain("page=1");
    expect(url).toContain("page_size=5");
    // Old params must NOT be sent anymore.
    expect(url).not.toContain("search_term=");
    expect(url).not.toContain("sort_key=");
    expect(url).not.toContain("include_unknown=");
  });

  it("retries 429 once then succeeds", async () => {
    const f = fetchMock()
      .mockResolvedValueOnce(makeResponse({}, 429))
      .mockResolvedValueOnce(makeResponse({ data: [] }));
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
      makeResponse({ data: [rawPool()] })
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

    const out = await searchMeteoraLive("SOL", {
      limit: 5,
      fetchImpl: f,
      baseUrl: "https://x.test",
      searchPath: "/pools",
    });

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
      makeResponse({ data: [rawPool({ token_y: { address: SCAM } })] })
    );
    resolveAsset
      .mockResolvedValueOnce({ symbol: "SOL", tier: "tier1" } as any) // SOL ok
      .mockRejectedValueOnce(new Error("boom")); // SCAM resolve fails

    const out = await searchMeteoraLive("SOL", {
      limit: 5,
      fetchImpl: f,
      baseUrl: "https://x.test",
      searchPath: "/pools",
    });

    expect(out).toHaveLength(1);
    expect(out[0].pool.stars).toBe(1); // only SOL known; SCAM failure → not known
    expect(out[0].tokenB).toBeNull();
  });

  it("returns [] when upstream matches nothing (empty-not-500 upstream of route)", async () => {
    const f = fetchMock().mockResolvedValue(makeResponse({ data: [] }));
    resolveAsset.mockResolvedValue(null);

    const out = await searchMeteoraLive("NOPE", {
      limit: 5,
      fetchImpl: f,
      baseUrl: "https://x.test",
    });
    expect(out).toEqual([]);
    expect(resolveAsset).not.toHaveBeenCalled(); // no identities → no trust-join
  });

  it("dedupes mints across pools before the trust-join", async () => {
    // Two pools sharing SOL → SOL resolved once.
    const f = fetchMock().mockResolvedValue(
      makeResponse({
        data: [
          rawPool({ address: "A" }),
          rawPool({ address: "B", token_y: { address: SCAM } }),
        ],
      })
    );
    resolveAsset
      .mockResolvedValueOnce({ symbol: "SOL", tier: "tier1" } as any) // SOL (once)
      .mockResolvedValueOnce({ symbol: "USDC" } as any) // USDC
      .mockResolvedValueOnce(null); // SCAM (uncurated)

    await searchMeteoraLive("SOL", {
      limit: 5,
      fetchImpl: f,
      baseUrl: "https://x.test",
      searchPath: "/pools",
    });

    // 3 unique mints (SOL, USDC, SCAM) → 3 resolveAsset calls, not 4.
    expect(resolveAsset).toHaveBeenCalledTimes(3);
  });
});
