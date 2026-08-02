/**
 * Ponytail self-check for the pure-fetch pools client. Run with:
 *   npx tsx src/client.test.ts
 *
 * Mocks global fetch and asserts the URL/params/envelope-parsing behaviour
 * of searchPools (happy path, empty-query short-circuit, empty-not-500,
 * limit clamp, venue wiring, trailing-slash strip). No framework — same
 * style as tokens-client/src/client.test.ts.
 */

import { createPoolsClient } from "./client";

const BASE_URL = "https://api.example.test";

let lastFetchArgs: [string, RequestInit] | null = null;
let nextResponse: { ok: boolean; body?: unknown; status?: number } | null =
  null;

(globalThis as any).fetch = async (url: string, init?: RequestInit) => {
  lastFetchArgs = [url as string, init as RequestInit];
  if (!nextResponse) throw new Error("no mock response queued");
  const { ok, body, status } = nextResponse;
  nextResponse = null;
  return {
    ok,
    status: status ?? (ok ? 200 : 500),
    json: async () => body,
  } as Response;
};

function queueResponse(ok: boolean, body: unknown, status?: number): void {
  nextResponse = { ok, body, status };
}

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

function reset(): void {
  lastFetchArgs = null;
  nextResponse = null;
}

function okEnvelope(query: string, venue: string, results: unknown[]) {
  return { success: true, data: { query, venue, results }, timestamp: 1 };
}

async function main(): Promise<void> {
  const client = createPoolsClient({ baseUrl: BASE_URL });

  // --- happy path: envelope parsing + URL wiring (q/venue/limit) ---
  reset();
  queueResponse(
    true,
    okEnvelope("sol/usdc", "raydium", [
      {
        address: "7QBQ6qXqLpMzHk8oM3pZ5nR1tY6uVxW2vK4jF3dCeGaH",
        venue: "raydium",
        tokenX: {
          mint: "So11111111111111111111111111111111111111112",
          symbol: "SOL",
          decimals: 9,
          logoUri: null,
          tier: "tier1",
        },
        tokenY: {
          mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // gitleaks:allow — public USDC mint
          symbol: "USDC",
          decimals: 6,
          logoUri: "https://x/usdc.png",
          tier: "tier1",
        },
        tvl: 1_200_000.5,
        feeRate: 0.0025,
        stars: 2,
        tier1: true,
        extras: { ammConfig: "abc" },
      },
    ])
  );
  const r = await client.searchPools("sol/usdc", {
    venue: "raydium",
    limit: 10,
  });
  assert(r.results.length === 1, "search should return 1 result");
  assert(r.venue === "raydium", "envelope venue mismatch");
  const pool = r.results[0];
  assert(pool.tokenX.symbol === "SOL", "tokenX symbol mismatch");
  assert(
    pool.tokenY.mint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // gitleaks:allow — public USDC mint
    "tokenY mint mismatch"
  );
  assert(pool.stars === 2, "stars mismatch");
  assert(pool.tier1 === true, "tier1 mismatch");
  assert(pool.tvl === 1_200_000.5, "tvl mismatch");
  assert(pool.extras?.ammConfig === "abc", "extras mismatch");
  const url = lastFetchArgs?.[0] ?? "";
  assert(url.startsWith(`${BASE_URL}/v1/pools/search?`), `URL root: ${url}`);
  assert(url.includes("q=sol"), `q param missing: ${url}`);
  assert(url.includes("venue=raydium"), `venue param missing: ${url}`);
  assert(url.includes("limit=10"), `limit param missing: ${url}`);

  // --- empty/whitespace query → empty envelope, no fetch ---
  reset();
  const empty = await client.searchPools("   ", { venue: "raydium" });
  assert(empty.results.length === 0, "empty query should yield no results");
  assert(empty.venue === "raydium", "empty-query envelope venue mismatch");
  assert(lastFetchArgs === null, "empty query should not call fetch");

  // --- HTTP error → empty results, NOT throw (ADR-0028 D3) ---
  reset();
  queueResponse(false, {}, 500);
  const errored = await client.searchPools("zzz", { venue: "raydium" });
  assert(errored.results.length === 0, "HTTP error should yield empty results");
  assert(errored.venue === "raydium", "error envelope venue mismatch");

  // --- success:false envelope → empty results ---
  reset();
  queueResponse(true, { success: false, timestamp: 1 });
  const failed = await client.searchPools("zzz", { venue: "raydium" });
  assert(failed.results.length === 0, "success:false should yield empty");

  // --- limit clamped to [1, 50] ---
  reset();
  queueResponse(true, okEnvelope("x", "raydium", []));
  await client.searchPools("x", { venue: "raydium", limit: 999 });
  assert(
    lastFetchArgs?.[0].includes("limit=50"),
    `limit should clamp to 50: ${lastFetchArgs?.[0]}`
  );

  reset();
  queueResponse(true, okEnvelope("x", "raydium", []));
  await client.searchPools("x", { venue: "raydium", limit: 0 });
  assert(
    lastFetchArgs?.[0].includes("limit=1"),
    `limit should clamp to 1: ${lastFetchArgs?.[0]}`
  );

  // --- venue wiring: different venue → different param ---
  reset();
  queueResponse(true, okEnvelope("x", "meteora", []));
  await client.searchPools("x", { venue: "meteora" });
  assert(
    lastFetchArgs?.[0].includes("venue=meteora"),
    `meteora venue wiring: ${lastFetchArgs?.[0]}`
  );

  // --- baseUrl trailing slash stripped ---
  reset();
  const slashClient = createPoolsClient({ baseUrl: `${BASE_URL}/` });
  queueResponse(true, okEnvelope("x", "raydium", []));
  await slashClient.searchPools("x", { venue: "raydium" });
  assert(
    lastFetchArgs?.[0].startsWith(`${BASE_URL}/v1/pools/search`),
    "trailing slash should be stripped"
  );
  assert(!lastFetchArgs?.[0].includes("//v1"), "should not double-slash");

  // --- null identity fields survive (uncurated legs) ---
  reset();
  queueResponse(
    true,
    okEnvelope("unk", "raydium", [
      {
        address: "Po1PooooWoRtHlEss3333333333333333333333333",
        venue: "raydium",
        tokenX: {
          mint: "UnkMintAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          symbol: null,
          decimals: null,
          logoUri: null,
          tier: null,
        },
        tokenY: {
          mint: "UnkMintBbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          symbol: null,
          decimals: null,
          logoUri: null,
          tier: null,
        },
        tvl: null,
        feeRate: null,
        stars: 0,
        tier1: false,
        extras: null,
      },
    ])
  );
  const thin = await client.searchPools("unk", { venue: "raydium" });
  assert(thin.results.length === 1, "thin pool should parse");
  assert(thin.results[0].tokenX.symbol === null, "null symbol should survive");
  assert(thin.results[0].stars === 0, "0 stars should survive");
  assert(thin.results[0].tier1 === false, "tier1 false should survive");

  console.log("OK — pools-client self-check passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
