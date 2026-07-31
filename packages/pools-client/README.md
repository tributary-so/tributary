# @tributary-so/pools-client

Pure-fetch client + React hooks + presentational picker for the Tributary
`/v1/pools/search` endpoint (pool resolver service). The client has zero
React; the `./react` subpath layers react-query hooks and a venue-agnostic
`PoolPicker` on top. See [ADR-0028][adr] and the "Pool resolver service"
milestone (tributary-gq0p).

[adr]: ../../apps/docs/adr/0028-tokens-xyz-asset-catalog-proxy.md

## Why

Pool selection used to be forked per venue inside the Mill app — a
`useRaydiumPoolSearch`, a `useMeteoraPoolSearch`, a duplicated direction
resolver, two near-identical row renderers. Every new venue meant another
clone. This package kills that drift with **one** client, **one** hook,
and **one** picker shell where `venue` is a param, not a branch. The
venue-specific normalization (fee units, ammConfig extras, ranking) lives
server-side; the client never switches on venue.

## Tech stack

- **Language**: TypeScript (ES2020 target, ESM)
- **Runtime**: Node 18+, browsers, edge — anywhere with global `fetch`
- **Optional peers**: `react` ^18/^19, `@tanstack/react-query` ^5 (only
  for the `./react` subpath; the core client has zero React)
- **Build**: `tsc` → `dist/`
- **Tests**: framework-free `tsx` self-checks (ponytail style)

## Install

The package is published to npm as `@tributary-so/pools-client`. Within
the Tributary monorepo it is already wired via pnpm workspace.

```bash
pnpm add @tributary-so/pools-client
# peer deps (only if you use the React hooks + picker):
pnpm add @tanstack/react-query@^5 react@^19
```

## Exports

| Subpath                            | What                                                   | React? |
| ---------------------------------- | ------------------------------------------------------ | :----: |
| `@tributary-so/pools-client`       | `createPoolsClient` + all response types               |   no   |
| `@tributary-so/pools-client/react` | `usePoolSearch` hook + `PoolPicker` components/helpers |  yes   |

The root barrel re-exports everything from `types.ts` and `client.ts` —
so the bare import is all you need unless you want the hooks/picker.

## Quick start

### 1. Pure-fetch client (no React)

```typescript
import { createPoolsClient } from "@tributary-so/pools-client";

const client = createPoolsClient({
  baseUrl: "https://api.tributary.so", // no trailing slash
  // fetch: customFetch, // optional override (defaults to global fetch)
});

// Ranked pool search — returns { query, venue, results: PoolSearchResult[] }
const { results } = await client.searchPools("sol/usdc", {
  venue: "raydium", // "meteora" | "raydium" | "whirlpool"
  limit: 20,
});
```

Failure stance (per ADR-0028 D3):

- HTTP non-2xx, `success: false` envelope, or network resolve error →
  `{ query, venue, results: [] }` (empty state, **not** an exception).
- Empty/whitespace query short-circuits to the same empty envelope
  **without calling `fetch`**.

The client **never throws** for upstream failures. It only rejects on a
network-level `fetch` throw (pass an `AbortSignal` to cancel).

### 2. React hook (react-query v5)

```tsx
import { usePoolSearch } from "@tributary-so/pools-client/react";

const clientOpts = { baseUrl: "https://api.tributary.so" };

// Debounced type-ahead (default 250ms). Disables for empty/whitespace queries.
function PoolSearch({ query, venue }: { query: string; venue: "raydium" }) {
  const { data, isLoading } = usePoolSearch(query, clientOpts, {
    venue,
    limit: 20,
    debounceMs: 250,
  });
  // data?.results → PoolSearchResult[]
}
```

The hook maintains a lazy singleton client per `baseUrl`, so you won't
re-create the closure on every render. Stale time: 30s.

### 3. Presentational picker (venue-agnostic)

```tsx
import {
  PoolResultsList,
  PoolRow,
  resolvePoolDirection,
  impliedPoolDirection,
  selectPool,
  formatTvl,
  formatFee,
  type PoolSelectHandler,
} from "@tributary-so/pools-client/react";

// Uniform onSelect contract — same 6 positional args for every venue:
const onPick: PoolSelectHandler = (
  poolAddress, srcMint, tgtMint, extras, srcMeta, tgtMeta,
) => {
  // extras carries venue-specific side channels (e.g. Raydium ammConfig);
  // the client never branches on venue.
};

// Standalone list shell (no HeroUI):
<PoolResultsList
  results={data?.results ?? []}
  onSelect={onPick}
  selectedAddress={selected}
/>

// Or embed the canonical row inside your own shell:
<AutocompleteItem key={pool.address}>
  <PoolRow pool={pool} selected={pool.address === selected} />
</AutocompleteItem>
```

The picker is dependency-light by design — no HeroUI, no Mill internals.
`PoolRow` is **not** a button itself; selection is owned by the shell so
it drops into any listbox/autocomplete.

## API reference

### `createPoolsClient(opts)`

| Option    | Type           | Required | Description                                                             |
| --------- | -------------- | :------: | ----------------------------------------------------------------------- |
| `baseUrl` | `string`       |   yes    | API origin, e.g. `https://api.tributary.so`. Trailing slashes stripped. |
| `fetch`   | `typeof fetch` |    no    | Override fetch (defaults to global).                                    |

Returns `PoolsClient` with:

- `searchPools(query, opts)` → `Promise<PoolSearchResponse>`
  - `opts.venue` (required): `"meteora" \| "raydium" \| "whirlpool"`.
  - `opts.limit` clamped to `[1, 50]`, default `20`.
  - `opts.signal`: `AbortSignal` to cancel the upstream request.
  - Empty/whitespace query short-circuits to
    `{ query: "", venue, results: [] }` without calling `fetch`.

### `usePoolSearch(query, clientOpts, opts)`

| Param group  | Field        | Type           | Default | Description                                       |
| ------------ | ------------ | -------------- | ------- | ------------------------------------------------- |
| `clientOpts` | `baseUrl`    | `string`       | —       | API origin.                                       |
|              | `fetch`      | `typeof fetch` | global  | Optional fetch override.                          |
| `opts`       | `venue`      | `PoolVenue`    | —       | Required venue filter.                            |
|              | `enabled`    | `boolean`      | `true`  | Gate the query (e.g. disable on devnet).          |
|              | `limit`      | `number`       | `20`    | Clamped to `[1, 50]`.                             |
|              | `debounceMs` | `number`       | `250`   | Debounce window before the query key transitions. |

Returns the `UseQueryResult<PoolSearchResponse>` from react-query. Query
key: `["pools", "search", venue, trimmedQuery, limit]`.

### Picker helpers

| Export                 | Signature                                                     | Purpose                                                      |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| `resolvePoolDirection` | `(pool, direction) => { srcMint, tgtMint, srcMeta, tgtMeta }` | Resolve legs from a pool + `"tokenX" \| "tokenY"`.           |
| `impliedPoolDirection` | `(pool, stableMints?) => Direction`                           | Swap-to-stable: accumulate the stable leg. Default `tokenY`. |
| `selectPool`           | `(pool, direction, onSelect) => void`                         | Emit the uniform 6-arg `onSelect` for a row click.           |
| `formatTvl`            | `(tvl) => string`                                             | `$1.2B / $3.4M / $12K / $500 / —`.                           |
| `formatFee`            | `(feeRate) => string`                                         | Fraction → `"0.25%"`. `null` → `—`.                          |
| `starGlyph`            | `(stars) => string`                                           | `"★".repeat(clamp(0,2))`.                                    |
| `STABLE_MINTS`         | `Set<string>`                                                 | USDC, USDT, EURC — display hint for implied direction.       |
| `PoolRow`              | component                                                     | Canonical row: logos + pair + trust badge + TVL + fee.       |
| `PoolResultsList`      | component                                                     | Standalone `<ul role="listbox">` shell emitting `onSelect`.  |

### Types

```typescript
type PoolVenue = "meteora" | "raydium" | "whirlpool";
type TokenTier = "tier1" | "tier2" | "tier3" | null;

interface PoolToken {
  mint: string; // Solana base58
  symbol: string | null;
  decimals: number | null;
  logo_uri: string | null;
  tier: TokenTier;
}

interface PoolSearchResult {
  address: string; // Pool account (base58)
  venue: PoolVenue;
  token_x: PoolToken;
  token_y: PoolToken;
  tvl: number | null; // USD at last sync
  feeRate: number | null; // FRACTION (0.0025 = 0.25%) — venue-normalized server-side
  stars: number; // 0|1|2 — one per known leg token
  tier1: boolean; // either leg is tier1
  extras: Record<string, unknown> | null; // venue-specific (e.g. Raydium ammConfig)
}

interface PoolSearchResponse {
  query: string;
  venue: PoolVenue;
  results: PoolSearchResult[];
}
```

## Scripts

| Command                      | Description                                               |
| ---------------------------- | --------------------------------------------------------- |
| `pnpm run build`             | Compile `src/` → `dist/` via `tsc`                        |
| `pnpm run lint`              | ESLint                                                    |
| `pnpm run lint:fix`          | ESLint with `--fix`                                       |
| `pnpm run test`              | Run the three `tsx` self-checks (client + react + picker) |
| `pnpm run clean`             | Remove `dist/`                                            |
| `pnpm run release`           | semantic-release (monorepo config)                        |
| `npx tsx src/client.test.ts` | Run just the client self-check                            |
| `npx tsx src/react.test.ts`  | Run just the hook self-check                              |
| `npx tsx src/picker.test.ts` | Run just the picker helper self-check                     |

## Testing

No test framework. The three `.test.ts` files are runnable `tsx` scripts
that mock `globalThis.fetch` (or render the hook DOM-free via
`react-test-renderer`) and `assert`-exit on the first failure — the
ponytail self-check style.

```bash
pnpm run test
# → OK — pools-client self-check passed
# → OK — pools-client usePoolSearch hook self-check passed
# → OK — pools-client PoolPicker helper self-check passed
```

Coverage:

- **client** — happy path + URL/params wiring, empty-query short-circuit,
  HTTP-error → empty results (not throw), `success:false` envelope, limit
  clamping to `[1, 50]`, venue wiring, trailing-slash strip, null
  identity fields survive.
- **react** — `enabled=false` gate, whitespace gate, valid query fetches
  - flows results back, debounce holds the fetch off until the window
    elapses.
- **picker** — `resolvePoolDirection` for both directions, `legMeta`
  fallbacks for unknown tokens, `impliedPoolDirection` swap-to-stable,
  `STABLE_MINTS` sanity, uniform 6-arg `selectPool` contract,
  `formatTvl`/`formatFee`/`starGlyph` formatting + clamp.

## Architecture

```
packages/pools-client/src/
├── index.ts           # Root barrel: types + client
├── types.ts           # Response shapes mirroring apps/api routes/pools.ts
├── client.ts          # createPoolsClient — pure fetch, no React
├── react.ts           # usePoolSearch — react-query v5 (re-exports picker)
├── picker.tsx         # PoolRow, PoolResultsList, direction/format helpers
├── client.test.ts     # tsx self-check (mocks fetch)
├── react.test.ts      # tsx self-check (react-test-renderer, no jsdom)
└── picker.test.ts     # tsx self-check (pure helper functions)
```

### Data flow

```
App (React) ──▶ usePoolSearch ──▶ createPoolsClient ──▶ GET /v1/pools/search
                    │                     │                     │
                    │                     │                     ▼
                    │                     │           apps/api (Express)
                    │                     │             ├─ IP rate limit (120/min)
                    │                     │             ├─ Redis cache (per q,venue,limit)
                    │                     │             ├─ ranked index (stars DESC, tvl DESC)
                    │                     │             └─ venue-normalized fee/extras
                    │                     ▼
                    │           ApiResponse<T> envelope
                    │           { success, data, timestamp }
                    ▼
            PoolSearchResult[]
                    │
                    ▼
            PoolResultsList / PoolRow  ──▶ selectPool ──▶ onSelect(address, src, tgt, extras, ...)
```

The server is the venue authority: it owns fee-unit normalization (each
venue's native unit → fraction), ranking, and the `extras` side channel
(Raydium's `ammConfig`, etc.). The client renders rows and emits a
**uniform** `onSelect` — the consumer never switches on venue either.

### One shell, all venues

The picker replaces Mill's two per-venue clones + duplicated
`pool-direction.ts`. `venue` is a query param, not a code path:

- `resolvePoolDirection` — one function for every venue, direction decides
  which leg is source vs target.
- `impliedPoolDirection` — display hint that accumulates the stable side
  (swap-to-stable); a user toggle in the shell is authoritative.
- `extras` — venue-specific fields ride a side channel; no client branch.

## Network gating

The upstream index is **mainnet-only**. Apps are expected to gate
type-ahead queries off on devnet/testnet/localnet (the hook's `enabled`
flag is the caller's knob). The hook itself is network-agnostic.

## License

MIT — see [repository root](../../LICENSE).
