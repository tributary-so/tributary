# tokens.xyz asset catalog proxy — type-ahead token search + mint resolver

## Decision

Tributary's token picker is no longer limited to the five well-known mints
baked into `token-store.ts`. A new shared workspace package
`@tributary-so/tokens-client` plus a server-side proxy at
`apps/api/src/routes/assets.ts` expose the tokens.xyz asset catalog
(stablecoins, LSTs, tokenized equities like SpaceX) to the form, while
keeping the upstream API key off the client.

Three moving parts:

1. **Proxy at `apps/api`, route `/v1/assets/*`** — new Express router
   mirroring upstream paths 1:1 (`/search`, `/resolve`). Injects
   `x-api-key` server-side. Wrapped in the existing `ApiResponse<T>`
   envelope. Filters out any result whose `primaryVariant` is missing or
   whose mint isn't valid base58 — no SPL mint = no token account = no
   Tributary payment.

2. **Shared private package `@tributary-so/tokens-client`** —
   `client.ts` (pure fetch, no React), `react.ts` (react-query hooks:
   `useAssetSearch`, `useResolveMint`, `useResolveMints`), and
   `devnetFallback.ts` which is the single source of truth for the
   `MINT_OVERRIDES` seed map. The api imports the same map for its
   resolve fallback so the form, the apps, and the api never disagree on
   what a known mint looks like.

3. **App-local UX** — each app owns its jotai `tokenMetadataAtom` state.
   On selection the dropdown writes both `formData.tokenMint = mint`
   and `tokenMetadataAtom[mint] = { symbol, name, decimals, logoURI,
network }`. The existing `TokenMetadata` shape is unchanged.

### Failure stance

- `/search` on upstream error → `200` with `results: []` (empty state,
  not error state).
- `/resolve` on upstream error → fall back to `MINT_OVERRIDES` (the same
  five baked-in mints) so account balances never render as truncated
  mints.
- Redis-cached per query (60s) and per mint (10min); IP rate-limited
  120/min.

### Network gating

The form is network-aware. On mainnet, type-ahead queries hit the proxy
and the static seed list renders instantly as bootstrap. On
devnet/testnet/localnet, the form shows only the static fallback list
(the upstream returns mainnet mints that have no token account on
devnet). A collapsed paste-mint toggle is the escape hatch for both
devnet and long-tail mainnet: validates `new PublicKey(mint)`, attempts
resolve, falls back to a generic metadata stub.

## Rejected alternatives

- **Browser-direct calls to tokens.xyz.** Rejected: their docs forbid
  shipping the API key in a client. The proxy is mandatory.

- **A new edge function instead of `apps/api`.** Rejected: `apps/api`
  already exists, already runs Express on `/v1`, already runs in prod
  at `api.tributary.so`. A second deployment surface duplicates
  observability, rate-limit state, and redis connectivity for no gain.

- **Thin passthrough of the upstream shape.** Rejected: the upstream
  shape is verbose (multiple variants per asset, cross-chain mints).
  We project to a slim `AssetSearchResult` that already filters to
  assets with a usable Solana mint — saves bytes, removes a class of
  "user picked an Ethereum-only asset" bugs.

- **A `/v1/tokens/*` route name.** Rejected: `/v1/tokens/*` is already
  taken (the JWT issuer at `routes/tokens.ts`). `/v1/assets/*` is more
  accurate anyway — SpaceX is an equity, not a token.

- **Lifting the seed map into each app.** Rejected: the api needs the
  same map for resolve fallback, and the apps need it as their instant
  bootstrap. Two copies would drift. The map lives in
  `packages/tokens-client/devnetFallback.ts`; both consumers import from
  there.

- **jotai atoms or HeroUI components inside the shared package.**
  Rejected: atoms are app-owned (different apps have different form
  state shapes), and HeroUI is app-local UX. The package stays
  framework-neutral; the apps own their wiring.

## Rationale

The proxy is the simplest shape that honors the upstream's key-safety
requirement, reuses existing `apps/api` infrastructure (Express router,
`ApiResponse` envelope, redis dep, rate-limit middleware), and keeps the
client bundle free of secrets. The shared package is the simplest shape
that avoids the previous drift between `apps/app/src/lib/token-store.ts`
and `apps/showcase-payment-policies/src/lib/token-store.ts` (they were
byte-identical) while still letting each app own its atom state.

The shaped-response projection (not passthrough) is deliberate: the
upstream's full asset graph (multiple variants, cross-chain mints) is
noise to Tributary. We only ever need one Solana mint per asset — the
primary variant. Filtering at the proxy means the client never has to
decide which variant is usable.

The paste-mint toggle is the deliberate escape hatch for both edge cases
that the catalog cannot cover: devnet (the catalog is mainnet-only) and
long-tail mainnet mints that haven't been indexed. A generic stub
(symbol prefix + decimals=6) is enough for the form to render; the user
can read raw amounts and the policy still executes correctly on-chain.

## References

- ADR-0001 — UserPayment-as-delegate (the PDA that owns the policies
  whose mints we resolve on the account page).
- `apps/api/src/routes/assets.ts` — proxy router.
- `apps/api/src/services/tokens-proxy.ts` — upstream fetch + cache +
  fallback.
- `apps/api/src/services/redis.ts` — shared lazy redis client.
- `packages/tokens-client/src/{client,react,devnetFallback}.ts` — the
  shared package.
- `apps/showcase-payment-policies/src/components/token-autocomplete.tsx`
  — HeroUI Autocomplete + paste-mint toggle.
- `apps/app/src/components/account/account-page.tsx` — `useResolveMints`
  effect after payment policies load.
- Milestone `tributary-fxyo` — design decisions (grilled 2026-07-03).
