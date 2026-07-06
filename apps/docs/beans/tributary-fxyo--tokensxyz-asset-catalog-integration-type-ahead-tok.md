---
# tributary-fxyo
title: tokens.xyz asset catalog integration (type-ahead token search + mint resolver)
status: completed
type: milestone
priority: high
created_at: 2026-07-03T10:11:00Z
updated_at: 2026-07-06T08:39:08Z
---

## Context

Both `apps/app` and `apps/showcase-payment-policies` ship a byte-identical `src/lib/token-store.ts` with 5 hard-coded tokens (USDC, SOL, USDT, mSOL, devnet USDC). The token `<Select>` in the showcase form (`policy-inputs.tsx:452-468`) offers only those 5. We want a type-ahead search powered by the **tokens.xyz Assets API** (`https://docs.tokens.xyz/v1/overview`) so users can bill in any tokenized asset (stablecoins, LSTs, tokenized equities like SpaceX).

The tokens.xyz API key is **server-side only** (per their docs). We proxy through `apps/api` (Express, already running at `api.tributary.so` / `devnet.api.tributary.so`).

## Design decisions (locked via grilling session 2026-07-03)

### D1 — Proxy at `apps/api`, route `/v1/assets/*`

- **Not** shipped in the browser bundle (docs forbid; key would leak).
- **Not** a new edge function — `apps/api` already exists, Express on `/v1`, prod at `api.tributary.so`.
- New router `routes/assets.ts` mounted at `/v1/assets`. Mirrors upstream paths 1:1 (`/search`, `/resolve`).
- **Naming:** `/v1/tokens/*` is already taken (JWT issuer at `routes/tokens.ts`). "assets" is more accurate anyway — SpaceX is an equity, not a token.

### D2 — Shaped response (not thin passthrough)

Wrapped in the existing `ApiResponse<T>` envelope (`{ success, data, timestamp }`), projected to a slim shape:

```ts
type AssetSearchResult = {
  assetId: string
  symbol: string
  name: string
  category: string | null         // "equity" | "stablecoin" | "lst" | ...
  imageUrl: string | null
  primaryVariant: {
    mint: string                  // Solana base58 — guaranteed present (we filter otherwise)
    decimals: number
    kind: string                  // "native" | "tokenized_equity" | "wrapped" | ...
    trustTier: string | null      // "tier1" | "tier2" | "tier3"
  } | null
}
```

Server filters out any result whose `primaryVariant` is missing or whose `mint` isn't valid base58 — those assets cannot be used by Tributary (no SPL mint = no token account = no payment).

### D3 — Redis cache + IP rate limit + graceful failure

- **Cache:** Redis (already a dep) keyed `tokens:search:<query>:<limit>` (TTL 60s) and `tokens:resolve:<mint>` (TTL 10min). Cross-user dedup.
- **Rate limit:** New `ipRateLimit(120/min)` middleware (can't use existing `walletRateLimit` — no wallet in request). Protects upstream quota from runaway clients.
- **Failure stance:**
  - `/search` on upstream error → `200` with `results: []` (empty state, not error state).
  - `/resolve` on upstream error → fall back to baked-in `MINT_OVERRIDES` map (USDC, SOL, USDT, mSOL, devnet USDC) so account balances don't render as truncated mints.

### D4 — Shared private package `packages/tokens-client/`

New workspace package `@tributary-so/tokens-client` (private). Matches existing precedent (`packages/sdk`, `packages/payments`, etc.).

**In the package:**
| File | Contents |
|------|----------|
| `types.ts` | `AssetSearchResult`, `ResolveResult`, `AssetCategory` |
| `client.ts` | `createTokensClient({ baseUrl, fetch })` → `{ search(query, opts), resolveMint(mint), resolveRef(ref) }`. Pure fetch, no React. |
| `react.ts` | `useAssetSearch(query, opts)` + `useResolveMint(mint)` + `useResolveMints(mints[])`. Built on `@tanstack/react-query` (peer dep). |
| `devnetFallback.ts` | Static `MINT_OVERRIDES` map. Single source of truth — `apps/api` imports this too for resolve fallback. |

**NOT in the package:**
- ❌ No jotai atoms (apps own their atom state).
- ❌ No HeroUI / React components (dropdown is app-local UX).
- ❌ No hardcoded `api.tributary.so` URL (`baseUrl` is a constructor arg).

### D5 — Selection model: store mint at selection time

- Dropdown writes **both** `formData.tokenMint = mint` (base58) AND `tokenMetadataAtom[mint] = { symbol, name, decimals, logoURI, network }`.
- The existing `TokenMetadata` shape (5 fields) is unchanged — already carries what the form readers (`getTokenSymbolAtom`, `getTokenPrecisionAtom`) need.
- **Flat variant selection:** one row per asset, silently use `primaryVariant.mint`. The 95% case. Power users paste mints manually (D7).

### D6 — Network-gated behavior

- `getNetworkFromRpcEndpoint()` already exists in the showcase.
- **Mainnet** → async search via API + static seed list (INITIAL_TOKENS) as instant bootstrap.
- **Devnet/testnet/localnet** → static fallback list only (filtered by network). The API returns mainnet mints that don't exist as token accounts on devnet.
- **Paste-mint toggle:** collapsed by default; expands to a base58 input. Validates `new PublicKey(mint)`, attempts resolve, falls back to generic metadata stub `{symbol: mint.slice(0,4)+'...', decimals: 6}`. This is the devnet escape hatch AND the long-tail-mainnet escape hatch.
- **Default form value:** network-aware — devnet USDC on devnet, mainnet USDC on mainnet.

### D7 — Dropdown UX

- HeroUI `<Autocomplete>` (both apps already use HeroUI).
- 250ms debounce, 1-char min query, 20 results.
- Static seed (INITIAL_TOKENS filtered by network) visible on focus before typing.
- Selected state: logo (16×16 rounded) + symbol bold + name muted. Monogram fallback (first 2 chars of symbol) when no `logoURI`.
- Loading: inline spinner. No results: "No tokens found for '{query}'" + paste-mint toggle. Error: silent empty (per D3).

### D8 — `apps/app` account-page resolver

- After wallet token accounts load, enumerate unique mints, diff against `tokenMetadataAtom`, resolve unknowns via `useResolveMints(mints[])`.
- **Enrich ALL wallet mints** (including INITIAL_TOKENS entries) — idempotent overwrite with richer data (adds `logoURI`). USDC renders instantly from seed, gets its logo ~500ms later.
- N parallel `resolveMint` calls via react-query `useQueries` (no batch endpoint — typical wallet <20 tokens).
- No localStorage persistence (react-query cache survives client-side navigation; cross-session re-resolve is cheap).

## API contract

### `GET /v1/assets/search?q=<query>&limit=<n>`

Proxy to `https://api.tokens.xyz/v1/assets/search`. Injects `x-api-key` server-side.

**Response** (200, `ApiResponse` envelope):
```json
{
  "success": true,
  "data": {
    "query": "spacex",
    "results": [
      {
        "assetId": "spacex",
        "symbol": "SPCX",
        "name": "SpaceX",
        "category": "equity",
        "imageUrl": "https://api.tokens.xyz/logos/prestocks/spacex.png",
        "primaryVariant": {
          "mint": "SPCXxcqXj6e5dJDVNovHN8744zkbhM2bYudU45BimGb",
          "decimals": 6,
          "kind": "tokenized_equity",
          "trustTier": "tier2"
        }
      }
    ]
  },
  "timestamp": 1783070812696
}
```

### `GET /v1/assets/resolve?mint=<base58>`

Proxy to `https://api.tokens.xyz/v1/assets/resolve?mint=<mint>`.

**Response** (200, `ApiResponse` envelope):
```json
{
  "success": true,
  "data": {
    "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "assetId": "usd",
    "symbol": "USDC",
    "name": "USD Coin",
    "decimals": 6,
    "imageUrl": null,
    "category": "stablecoin"
  },
  "timestamp": 1783070812696
}
```

On upstream failure: serve from `MINT_OVERRIDES` (same map shared with `packages/tokens-client/devnetFallback.ts`).

## File-level touch list

| Path | Change |
|------|--------|
| `apps/api/src/routes/assets.ts` | **NEW** — search + resolve handlers, Redis cache, upstream fetch |
| `apps/api/src/routes/index.ts` | Mount `assetsRouter` at `/v1/assets` |
| `apps/api/src/middleware/rateLimit.ts` | Add `ipRateLimit({ windowMs, maxRequests })` |
| `apps/api/src/services/tokens-proxy.ts` | **NEW** — upstream fetch client + cache layer |
| `apps/api/.env.example` | Add `TOKENS_XYZ_API_KEY`, `TOKENS_XYZ_BASE_URL` |
| `apps/api/src/openapi.ts` | Register new paths |
| `packages/tokens-client/` | **NEW** package — `package.json`, `tsconfig`, `src/{types,client,react,devnetFallback}.ts` |
| `packages/tokens-client/devnetFallback.ts` | `MINT_OVERRIDES` — single source of truth |
| `apps/showcase-payment-policies/src/lib/token-store.ts` | Slim: import from `@tributary-so/tokens-client`, wire atom |
| `apps/showcase-payment-policies/src/components/policy-inputs.tsx` | Swap `<Select>` → `<Autocomplete>` + paste-mint toggle (lines 452-468) |
| `apps/app/src/lib/token-store.ts` | Slim: import from `@tributary-so/tokens-client`, wire atom |
| `apps/app/src/components/account/account-page.tsx` | Add `useResolveMints` effect after balances load (near line 1221) |
| `apps/docs/adr/0024-tokens-xyz-asset-catalog-proxy.md` | **NEW** ADR |
| `apps/docs/docs/api/rest-api.md` | Document `/v1/assets/*` |

## Environment

- `TOKENS_XYZ_API_KEY` — server-side only, in `apps/api/.env`
- `TOKENS_XYZ_BASE_URL` — default `https://api.tokens.xyz/v1`
- `VITE_API_BASE_URL` — already convention (`apps/checkout/src/constants.ts:22`); both apps adopt it

## Summary of Changes

### Phase 1 — packages/tokens-client/ (NEW shared workspace package)

- `package.json`, `tsconfig.json`, src layout. ESM-only, tsc-built.
- `src/types.ts` — AssetSearchResult, AssetVariant, ResolveResult, AssetCategory, response envelopes.
- `src/devnetFallback.ts` — MINT_OVERRIDES map (USDC, SOL, USDT, mSOL, devnet USDC). Single source of truth — re-exported as INITIAL_TOKENS for app seed.
- `src/client.ts` — createTokensClient({ baseUrl, fetch }) → { search, resolveMint, resolveRef }. Pure fetch.
- `src/react.ts` — useAssetSearch (debounced 250ms), useResolveMint, useResolveMints (parallel via useQueries). Separate /react subpath export so the Node api consumer doesn't pull react-query.
- `src/index.ts` — re-exports types + client + devnetFallback.
- `src/devnetFallback.test.ts` — ponytail self-check (validates every mint is base58, lookupOverride round-trips, defaultMintForNetwork is correct).

### Phase 2 — apps/api (proxy)

- `src/routes/assets.ts` (NEW) — GET /search + GET /resolve handlers, ipRateLimit(120/min) at router level, JSDoc @openapi annotations.
- `src/services/tokens-proxy.ts` (NEW) — upstream fetch + base58 mint validation + Redis cache (search TTL 60s, resolve TTL 10min) + MINT_OVERRIDES fallback on resolve failure. AbortSignal.timeout(4s) on upstream.
- `src/services/redis.ts` (NEW) — lazy singleton client + cacheGet/cacheSet JSON helpers. No-ops when REDIS_URL unset (local dev).
- `src/middleware/rateLimit.ts` — added ipRateLimit() wrapper (default IP-keyed behavior of existing rateLimit).
- `src/routes/index.ts` — mount assetsRouter at /v1/assets.
- `src/openapi.ts` — register Assets + Gateway tags.
- `.env.example` — TOKENS_XYZ_API_KEY, TOKENS_XYZ_BASE_URL.
- `package.json` — depends on @tributary-so/tokens-client.

### Phase 3 — apps/showcase-payment-policies (Autocomplete UX)

- `src/lib/token-store.ts` — slimmed; imports INITIAL_TOKENS + types from @tributary-so/tokens-client.
- `src/components/token-autocomplete.tsx` (NEW) — HeroUI Autocomplete with paste-mint toggle. Network-gated (mainnet=async search + seed, devnet=seed only). Selected state shows logo + symbol + name; monogram fallback. Debounced 250ms. Per D5 writes both formData.tokenMint AND tokenMetadataAtom.
- `src/components/policy-inputs.tsx` — replaced <Select> (was lines 538-557) with <TokenAutocomplete>. Removed dead filteredTokens/availableTokensAtom. Network-aware default mint via defaultMintForNetwork().
- `src/constants.ts` — unchanged (already exposes API_BASE_URL).
- `package.json` — depends on @tributary-so/tokens-client.

### Phase 4 — apps/app (account-page resolver)

- `src/lib/token-store.ts` — slimmed (same shape as showcase).
- `src/lib/api.ts` (NEW) — API_BASE_URL const (VITE_API_BASE_URL with api.tributary.so fallback).
- `src/components/account/account-page.tsx` — added useResolveMints() over unique mints derived from userPayments, effect writes resolved metadata back to tokenMetadataAtom (idempotent — doesn't clobber richer existing entries).
- `package.json` — depends on @tributary-so/tokens-client.

### Phase 5 — docs

- `apps/docs/adr/0028-tokens-xyz-asset-catalog-proxy.md` (NEW) — locked-in decision (0024 in the bean body was already taken by PayAsYouGo expiration; this uses 0028, the next free slot).
- `apps/docs/docs/api/rest-api.md` — documented GET /v1/assets/search + GET /v1/assets/resolve with full request/response examples.

### Verification

- packages/tokens-client: tsc build clean; `pnpm run test` self-check passes.
- apps/api: tsc build clean.
- apps/showcase-payment-policies: tsc -b clean.
- apps/app: tsc -b clean.
- Pre-existing lint errors (3x `any` in account-page.tsx, 1x in payment-details.tsx, 3x react-refresh warnings) are on untouched lines — none introduced.

### Ponytail notes

- ipRateLimit is a one-line alias — existing rateLimit already keys on IP by default. Adding a separate factory would be slop.
- Redis client no-ops without REDIS_URL. Local dev (no redis) just hits empty cache; production gets dedup. No new required infra for dev.
- resolveRef routes through search (no separate upstream endpoint yet) — ponytail: noted inline.
- Paste-mint fallback uses decimals=6 generic stub — ponytail: noted inline.
- ADR is numbered 0028, not 0024 as the bean body said — 0024 was already taken when this landed.
