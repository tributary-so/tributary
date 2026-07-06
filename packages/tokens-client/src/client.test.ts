/**
 * Ponytail self-check for the pure-fetch client. Run with:
 *   npx tsx src/client.test.ts
 *
 * Mocks global fetch and asserts the URL/params/parsing behavior of
 * search/resolveMint/resolveRef. No framework — same style as
 * devnetFallback.test.ts.
 */

import { createTokensClient } from "./client";

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

async function main(): Promise<void> {
  const client = createTokensClient({ baseUrl: BASE_URL });

  // --- search: happy path ---
  reset();
  queueResponse(true, {
    success: true,
    data: {
      query: "usdc",
      results: [
        {
          assetId: "usd",
          symbol: "USDC",
          name: "USD Coin",
          category: "stablecoin",
          imageUrl: null,
          primaryVariant: {
            mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            decimals: 6,
            kind: "native",
            trustTier: "tier1",
          },
        },
      ],
    },
    timestamp: 1,
  });
  const searchResult = await client.search("usdc", { limit: 5 });
  assert(searchResult.results.length === 1, "search should return 1 result");
  assert(searchResult.results[0].symbol === "USDC", "search symbol mismatch");
  assert(
    searchResult.results[0].primaryVariant?.mint.startsWith("EPjFWdd5"),
    "search mint mismatch"
  );
  assert(
    lastFetchArgs?.[0] === `${BASE_URL}/v1/assets/search?q=usdc&limit=5`,
    `search URL mismatch: ${lastFetchArgs?.[0]}`
  );

  // --- search: empty query returns empty envelope without calling fetch ---
  reset();
  const empty = await client.search("   ");
  assert(empty.results.length === 0, "empty query should yield no results");
  assert(lastFetchArgs === null, "empty query should not call fetch");

  // --- search: HTTP error → empty results, not throw ---
  reset();
  queueResponse(false, {}, 500);
  const errored = await client.search("zzz");
  assert(errored.results.length === 0, "HTTP error should yield empty results");

  // --- search: limit is clamped to [1, 50] ---
  reset();
  queueResponse(true, {
    success: true,
    data: { query: "x", results: [] },
    timestamp: 1,
  });
  await client.search("x", { limit: 999 });
  assert(
    lastFetchArgs?.[0].includes("limit=50"),
    `limit should be clamped to 50: ${lastFetchArgs?.[0]}`
  );

  reset();
  queueResponse(true, {
    success: true,
    data: { query: "x", results: [] },
    timestamp: 1,
  });
  await client.search("x", { limit: 0 });
  assert(
    lastFetchArgs?.[0].includes("limit=1"),
    `limit should be clamped to 1: ${lastFetchArgs?.[0]}`
  );

  // --- resolveMint: happy path ---
  reset();
  queueResponse(true, {
    success: true,
    data: {
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      assetId: "usd",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      imageUrl: null,
      category: "stablecoin",
    },
    timestamp: 1,
  });
  const resolved = await client.resolveMint(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );
  assert(resolved?.symbol === "USDC", "resolveMint symbol mismatch");
  assert(resolved?.decimals === 6, "resolveMint decimals mismatch");

  // --- resolveMint: non-OK → null ---
  reset();
  queueResponse(false, {}, 404);
  const missing = await client.resolveMint(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );
  assert(missing === null, "resolveMint should return null on non-OK");

  // --- resolveRef: routes through search, picks first primaryVariant ---
  reset();
  queueResponse(true, {
    success: true,
    data: {
      query: "spacex",
      results: [
        {
          assetId: "spacex",
          symbol: "SPCX",
          name: "SpaceX",
          category: "equity",
          imageUrl: "https://x/logo.png",
          primaryVariant: {
            mint: "SPCXxcqXj6e5dJDVNovHN8744zkbhM2bYudU45BimGb",
            decimals: 6,
            kind: "tokenized_equity",
            trustTier: "tier2",
          },
        },
      ],
    },
    timestamp: 1,
  });
  const ref = await client.resolveRef("spacex");
  assert(ref?.symbol === "SPCX", "resolveRef symbol mismatch");
  assert(
    ref?.mint === "SPCXxcqXj6e5dJDVNovHN8744zkbhM2bYudU45BimGb",
    "resolveRef mint mismatch"
  );
  assert(ref?.decimals === 6, "resolveRef decimals mismatch");

  // --- resolveRef: returns null when search yields no usable variant ---
  reset();
  queueResponse(true, {
    success: true,
    data: {
      query: "x",
      results: [
        {
          assetId: "x",
          symbol: "X",
          name: "X",
          category: null,
          imageUrl: null,
          primaryVariant: null,
        },
      ],
    },
    timestamp: 1,
  });
  const noVariant = await client.resolveRef("x");
  assert(
    noVariant === null,
    "resolveRef should return null when no primaryVariant"
  );

  // --- baseUrl trailing slash stripped ---
  reset();
  const slashClient = createTokensClient({ baseUrl: `${BASE_URL}/` });
  queueResponse(true, {
    success: true,
    data: { query: "x", results: [] },
    timestamp: 1,
  });
  await slashClient.search("x");
  assert(
    lastFetchArgs?.[0].startsWith(`${BASE_URL}/v1/`),
    "trailing slash should be stripped"
  );
  assert(!lastFetchArgs?.[0].includes("//v1"), "should not double-slash");

  console.log("OK — client self-check passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
