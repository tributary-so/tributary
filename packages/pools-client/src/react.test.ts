/**
 * Ponytail self-check for the usePoolSearch React hook. Run with:
 *   npx tsx src/react.test.ts
 *
 * Renders the hook DOM-free via react-test-renderer (matches the react
 * peer version; no jsdom/testing-library in this package). Asserts the
 * enabled gate, the empty/whitespace gate, that a valid query fetches +
 * flows results back, and that the debounce holds the fetch off until the
 * window elapses. Uses React.createElement (not JSX) so this stays a .ts
 * file, which tsconfig excludes from the dist build (test files).
 */

import { createElement as h } from "react";
import { act, create } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { usePoolSearch } from "./react";
import type { PoolSearchResponse } from "./types";

// Enable React's act() in a plain tsx process (React 19 checks this flag).
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const BASE_URL = "https://api.example.test";

let fetchCount = 0;
let lastUrl = "";

function makeFetch(result: PoolSearchResponse) {
  return async (url: string): Promise<Response> => {
    fetchCount++;
    lastUrl = url;
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: result, timestamp: 1 }),
    } as Response;
  };
}

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

/**
 * Flush react-query's async state updates by looping act across a few
 * timer ticks. A single await is not enough — react-query notifies the
 * component on a microtask that needs its own act boundary to commit.
 */
async function settle(ms = 120): Promise<void> {
  const deadline = Date.now() + ms;
  do {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
  } while (Date.now() < deadline);
}

interface HarnessProps {
  query: string;
  venue: "raydium" | "meteora" | "whirlpool";
  enabled?: boolean;
  debounceMs?: number;
  fetchImpl: typeof fetch;
}

let lastResult: ReturnType<typeof usePoolSearch> | null = null;

function Harness({
  query,
  venue,
  enabled,
  debounceMs,
  fetchImpl,
}: HarnessProps): null {
  lastResult = usePoolSearch(
    query,
    { baseUrl: BASE_URL, fetch: fetchImpl },
    { venue, enabled, debounceMs }
  );
  return null;
}

function newClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // gcTime: Infinity — each test owns a fresh client, so never GC a
      // query mid-test (GC fires cache-removal updates outside act()).
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
    },
  });
}

function tree(client: QueryClient, props: HarnessProps) {
  return h(QueryClientProvider, { client }, h(Harness, props));
}

async function main(): Promise<void> {
  const solResult: PoolSearchResponse = {
    query: "sol",
    venue: "raydium",
    results: [
      {
        address: "PoolSOL11111111111111111111111111111111111",
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
          logoUri: null,
          tier: "tier1",
        },
        tvl: 9000,
        feeRate: 0.0025,
        stars: 2,
        tier1: true,
        extras: null,
      },
    ],
  };

  // --- enabled gate: enabled=false suppresses the fetch entirely ---
  fetchCount = 0;
  {
    const root = create(
      tree(newClient(), {
        query: "sol",
        venue: "raydium",
        enabled: false,
        fetchImpl: makeFetch(solResult),
      })
    );
    await settle(300);
    assert(fetchCount === 0, "enabled=false should never fetch");
    act(() => root.unmount());
  }

  // --- empty/whitespace gate: blank query self-disables ---
  fetchCount = 0;
  {
    const root = create(
      tree(newClient(), {
        query: "   ",
        venue: "raydium",
        fetchImpl: makeFetch(solResult),
      })
    );
    await settle(300);
    assert(fetchCount === 0, "whitespace query should never fetch");
    act(() => root.unmount());
  }

  // --- valid query fetches + results flow back through the hook ---
  fetchCount = 0;
  {
    const root = create(
      tree(newClient(), {
        query: "sol",
        venue: "raydium",
        debounceMs: 50,
        fetchImpl: makeFetch(solResult),
      })
    );
    await settle(250);
    assert(fetchCount === 1, `valid query should fetch once: ${fetchCount}`);
    assert(
      lastUrl.includes("q=sol") && lastUrl.includes("venue=raydium"),
      `fetch URL wiring: ${lastUrl}`
    );
    assert(
      lastResult?.data?.results.length === 1,
      "hook should surface parsed results"
    );
    assert(
      lastResult?.data?.results[0].tokenX.symbol === "SOL",
      "hook result symbol mismatch"
    );
    act(() => root.unmount());
  }

  // --- debounce: a query change is held off until the window elapses ---
  // Same QueryClient across both renders so the cache is continuous and
  // the only thing that can delay the second fetch is the debounce timer.
  fetchCount = 0;
  {
    const client = newClient();
    const root = create(
      tree(client, {
        query: "sol",
        venue: "raydium",
        debounceMs: 200,
        fetchImpl: makeFetch(solResult),
      })
    );
    await settle(350);
    assert(fetchCount === 1, "initial query should fetch once");

    // Change the query — debounce must NOT fire the new fetch synchronously.
    act(() => {
      root.update(
        tree(client, {
          query: "usdc",
          venue: "raydium",
          debounceMs: 200,
          fetchImpl: makeFetch({ ...solResult, query: "usdc" }),
        })
      );
    });
    assert(
      fetchCount === 1,
      "debounce should hold the new query off (no immediate fetch)"
    );

    // After the debounce window, the new query fires.
    await settle(350);
    assert(
      fetchCount === 2,
      `debounce should let the new query fire after the window: ${fetchCount}`
    );
    act(() => root.unmount());
  }

  console.log("OK — pools-client usePoolSearch hook self-check passed");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
