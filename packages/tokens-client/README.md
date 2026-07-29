# @tributary-so/tokens-client

Client + React hooks for the Tributary `/v1/assets` proxy (the tokens.xyz
asset catalog). Pure-fetch client, react-query hooks, and the shared
`MINT_OVERRIDES` fallback map — the single source of truth shared by the
Tributary apps and the API server. See [ADR-0028][adr].

[adr]: ../../apps/docs/adr/0028-tokens-xyz-asset-catalog-proxy.md

## Why

The token picker used to be limited to five well-known mints baked into
each app. This package wraps the server-side proxy that exposes the full
tokens.xyz catalog (stablecoins, LSTs, tokenized equities like SpaceX)
while keeping the upstream API key off the client. The same package also
owns the static `MINT_OVERRIDES` seed map — used as the instant-render
bootstrap in the apps **and** the resolve fallback in the API — so the two
never drift.

## Tech stack

- **Language**: TypeScript (ES2020 target, ESM)
- **Runtime**: Node 18+, browsers, edge — anywhere with global `fetch`
- **Optional peers**: `react` ^18/^19, `@tanstack/react-query` ^5 (only
  for the `./react` subpath; the core client has zero React)
- **Build**: `tsc` → `dist/`
- **Tests**: framework-free `tsx` self-checks (ponytail style)

## Install

The package is published to npm as `@tributary-so/tokens-client`. Within
the Tributary monorepo it is already wired via pnpm workspace.

```bash
pnpm add @tributary-so/tokens-client
# peer deps (only if you use the React hooks):
pnpm add @tanstack/react-query@^5 react@^19
```

## Exports

| Subpath                                      | What                                                                          | React? |
| -------------------------------------------- | ----------------------------------------------------------------------------- | :----: |
| `@tributary-so/tokens-client`                | `createTokensClient` + all response types                                     |   no   |
| `@tributary-so/tokens-client/react`          | `useAssetSearch`, `useResolveMint`, `useResolveMints`                         |  yes   |
| `@tributary-so/tokens-client/devnetFallback` | `MINT_OVERRIDES`, `INITIAL_TOKENS`, `lookupOverride`, `defaultMintForNetwork` |   no   |

The root barrel re-exports everything from `types.ts`, `client.ts`, **and**
`devnetFallback.ts` — so the bare import is all you need unless you want
the hooks.

## Quick start

### 1. Pure-fetch client (no React)

```typescript
import { createTokensClient } from "@tributary-so/tokens-client";

const client = createTokensClient({
  baseUrl: "https://api.tributary.so", // no trailing slash
  // fetch: customFetch, // optional override (defaults to global fetch)
});

// Type-ahead search — returns { query, results: AssetSearchResult[] }
const { results } = await client.search("usdc", { limit: 10 });

// Resolve a single mint → ResolveResult | null
const meta = await client.resolveMint(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

// Resolve by symbol/name ref (routes through search, picks top hit)
const ref = await client.resolveRef("spacex");
```

Failure stance (per ADR-0028):

- `search` on upstream error → `{ query, results: [] }` (empty state, not
  an exception).
- `resolveMint` / `resolveRef` on upstream error → `null`.

The client **never throws** for upstream failures. It only rejects on a
network-level `fetch` throw (pass an `AbortSignal` to cancel).

### 2. React hooks (react-query v5)

```tsx
import {
  useAssetSearch,
  useResolveMints,
} from "@tributary-so/tokens-client/react";

const clientOpts = { baseUrl: "https://api.tributary.so" };

// Debounced type-ahead (default 250ms). Disables for empty queries.
function TokenPicker({ query }: { query: string }) {
  const { data, isLoading } = useAssetSearch(query, clientOpts, {
    limit: 20,
    debounceMs: 250,
  });
  // data?.results → AssetSearchResult[]
}

// Resolve every mint in a wallet in parallel.
function WalletTokens({ mints }: { mints: string[] }) {
  const queries = useResolveMints(mints, clientOpts);
  // queries: UseQueryResult<ResolveResult | null>[] (deduped, stable order)
}
```

Hooks maintain a lazy singleton client per `baseUrl`, so you won't
re-create the closure on every render. Stale times: search 60s, resolve
10min — matching the server-side Redis TTLs.

### 3. Devnet fallback / static seed

```typescript
import {
  MINT_OVERRIDES, // TokenMetadataMap — the five well-known mints
  INITIAL_TOKENS, // alias of MINT_OVERRIDES (app-store naming)
  lookupOverride, // (mint) => TokenMetadata | null
  defaultMintForNetwork, // (network) => mint string
} from "@tributary-so/tokens-client/devnetFallback";

// Seed an atom so the form renders before any network call:
// tokenMetadataAtom.set(MINT_OVERRIDES);

// Pick a sane default per network (devnet USDC on devnet, mainnet USDC elsewhere):
const defaultMint = defaultMintForNetwork("devnet");
```

This map is the **single source of truth** — the API server imports the
same map as its resolve fallback, so the form, the apps, and the API
never disagree on what a known mint looks like.

## API reference

### `createTokensClient(opts)`

| Option    | Type           | Required | Description                                                             |
| --------- | -------------- | :------: | ----------------------------------------------------------------------- |
| `baseUrl` | `string`       |   yes    | API origin, e.g. `https://api.tributary.so`. Trailing slashes stripped. |
| `fetch`   | `typeof fetch` |    no    | Override fetch (defaults to global).                                    |

Returns `TokensClient` with:

- `search(query, { limit?, signal? })` → `Promise<AssetSearchResponse>`
  - `limit` clamped to `[1, 50]`, default `20`.
  - Empty/whitespace query short-circuits to `{ query, results: [] }`
    without calling `fetch`.
- `resolveMint(mint, { signal? })` → `Promise<ResolveResult | null>`
- `resolveRef(ref, { signal? })` → `Promise<ResolveResult | null>` (forward-only; routes through `search` and picks the first result's `primaryVariant`)

### Types

```typescript
type AssetCategory =
  | "equity"
  | "stablecoin"
  | "lst"
  | "native"
  | "wrapped"
  | "tokenized_equity"
  | string
  | null;

interface AssetVariant {
  mint: string; // Solana base58, always present (server-filtered)
  decimals: number;
  kind: string; // "native" | "tokenized_equity" | "wrapped" | ...
  trustTier: string | null; // "tier1" | "tier2" | "tier3" | null
}

interface AssetSearchResult {
  assetId: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  imageUrl: string | null;
  primaryVariant: AssetVariant | null; // null = no usable Solana mint
}

interface ResolveResult {
  mint: string;
  assetId: string | null;
  symbol: string;
  name: string | null;
  decimals: number | null;
  imageUrl: string | null;
  category: AssetCategory;
}
```

## Scripts

| Command                              | Description                                             |
| ------------------------------------ | ------------------------------------------------------- |
| `pnpm run build`                     | Compile `src/` → `dist/` via `tsc`                      |
| `pnpm run test`                      | Run the two `tsx` self-checks (client + devnetFallback) |
| `pnpm run clean`                     | Remove `dist/`                                          |
| `pnpm run release`                   | semantic-release (monorepo config)                      |
| `npx tsx src/client.test.ts`         | Run just the client self-check                          |
| `npx tsx src/devnetFallback.test.ts` | Run just the fallback map self-check                    |

## Testing

No test framework. The two `.test.ts` files are runnable `tsx` scripts
that mock `globalThis.fetch` and `assert`-exit on the first failure —
the ponytail self-check style.

```bash
pnpm run test
# → OK — devnetFallback self-check passed
# → OK — client self-check passed
```

The client self-check covers: search happy path + URL/params, empty-query
short-circuit, HTTP-error → empty results, limit clamping to `[1, 50]`,
`resolveMint` happy + null-on-error, `resolveRef` routing through search,
and trailing-slash stripping on `baseUrl`.

## Architecture

```
packages/tokens-client/src/
├── index.ts           # Root barrel: types + client + devnetFallback
├── types.ts           # Response shapes mirroring apps/api routes/assets.ts
├── client.ts          # createTokensClient — pure fetch, no React
├── react.ts           # useAssetSearch / useResolveMint(s) — react-query v5
├── devnetFallback.ts  # MINT_OVERRIDES single source of truth (apps + api)
├── client.test.ts     # tsx self-check (mocks fetch)
└── devnetFallback.test.ts
```

### Data flow

```
App (React) ──▶ useAssetSearch ──▶ createTokensClient ──▶ GET /v1/assets/search
                                       │                        │
                                       │                        ▼
                                       │              apps/api proxy (Express)
                                       │                ├─ inject x-api-key
                                       │                ├─ Redis cache (60s/10min)
                                       │                ├─ filter to Solana mints
                                       │                └─ tokens.xyz upstream
                                       ▼
                              ApiResponse<T> envelope
                              { success, data, timestamp }
```

The server is the authority: it filters upstream results to assets that
carry a usable Solana SPL mint (`primaryVariant`). The client never has
to decide which variant is usable — if `primaryVariant` is null, the
asset has no Tributary-representable token.

### Three consumers, one map

`devnetFallback.ts` is imported by:

1. **The apps** — as `INITIAL_TOKENS`, the instant-render seed for each
   app's `tokenMetadataAtom`.
2. **The API server** — as the `resolve` fallback when the upstream call
   fails, so balances never render as truncated mints.
3. **This package's own hooks** — not directly, but the resolve hook
   returns the same `ResolveResult` shape the map feeds.

One map, three consumers, zero drift.

## Network gating

The upstream catalog is **mainnet-only**. Apps are expected to gate
type-ahead queries off on devnet/testnet/localnet and show only the
static `MINT_OVERRIDES` list (plus a paste-mint escape hatch). The hooks
themselves are network-agnostic — `enabled` is the caller's knob.

## License

MIT — see [repository root](../../LICENSE).

## Bumps
