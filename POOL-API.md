# POOL-API — Server-side multi-venue pool resolver (IMPLEMENTED)

**Status:** Implemented (server + client) in merge `35c89157` / milestone `tributary-gq0p`. **Not deployed; `@tributary-so/pools-client` not published to npmjs** (workspace-only until release). Mill migration pending.
**Surface of record:** `apps/api/src/routes/pools.ts`, `apps/api/src/db/schema-pools.ts`, `apps/api/src/db/pools.ts`, `apps/api/src/services/pools-{search,sync,tokens}.ts`, `apps/api/src/services/raydium-sync.ts`, `apps/api/src/index.ts`, `packages/pools-client/`.
**Related:** ADR-0028 (assets proxy / failure stance), ADR-0001 (per-template gateway authority), `TRIBUTARY-WASM-FIX.md`.

> This was a design doc; the design shipped. It is now the reference for the actual
> API surface and the punch-list to finish the vision (Meteora live-proxy resolver,
> Whirlpool, one type fix, Mill migration, deploy/publish).

---

## 1. What shipped

A server-side pool resolver that realizes the grilling decisions:

> **Free-text → POOL first; tokens.xyz is a parallel trust layer that precomputes
> 0/1/2 stars — never a gate.** Scam-_filtering_ became scam-_labeling_; results are
> always real pools on the selected venue; user choice is never limited (paste-mint
> always resolves).

- **Endpoint** `GET /v1/pools/search?q=&venue=&limit=` — ranked real pools, Redis-cached ~30s, IP-rate-limited 120/min, **empty-not-500** (ADR-0028 D3).
- **Resolver, two per-venue modes (the client never sees which):** **indexed** — a dedicated Postgres schema (`pools`) synced by a normalizer on a 5-min tick with a **separate sync DB pool** so writes never starve request reads (Raydium); or **live-proxy** — forward the venue's own free-text query per request, then join the trust layer (Meteora). **Index where the venue lacks free-text; live-proxy where it has it.**
- **Trust** via tokens.xyz (reusing `services/tokens-proxy.ts` `resolveAsset`): `known`/`tier` per mint → `stars` (0/1/2) + `tier1` flag, ranked `stars DESC, tvl DESC` (precomputed for indexed venues; joined per-query for live venues).
- **Client** `@tributary-so/pools-client` — pure-fetch client + `usePoolSearch` react-query hook + a venue-agnostic `PoolPicker` shell. **One hook/shell for all venues; `venue` is a param, not a branch.**

## 2. Decisions → realization (grilling record)

| #                                                                                                    | Decision                                                                                                                                                                                                                                                     | How it landed                                                                     |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------ |
| **D1** server-side                                                                                   | `apps/api` route + sync; `packages/pools-client` consumer.                                                                                                                                                                                                   | ✓ `routes/pools.ts`, `services/pools-*`, `packages/pools-client`.                 |
| **D2** tokens.xyz not a gate; paste always works                                                     | `known = !!asset`; uncurated mints still index/rank at 0★. Paste-mint matches `mintA`/`mintB`/`address` in `searchPools`.                                                                                                                                    | ✓ (singleton _identity_ enrichment deferred — §6).                                |
| **D3** pool-first + trust join                                                                       | Search hits real pools first; `tokens` is a left-join for display/tier only.                                                                                                                                                                                 | ✓ `searchPools` double-joins `tokens` (indexed); live venues join after fetching. |
| **D4** one endpoint per venue; **index where the venue lacks free-text, live-proxy where it has it** | Resolver has `mode: "indexed" \| "live"` (client-invisible). **Only Raydium wired so far** (indexed); Meteora = live-proxy, Whirlpool = TBD (§6). The index is _forced_ for mint-only venues (Raydium) and _optional_ for free-text venues (Meteora → live). | ◐                                                                                 |
| **D5** loose-presence stars that **rank**                                                            | `stars = known(a)+known(b)`, `tier1 = tier(a                                                                                                                                                                                                                 | b)='tier1'`; `ORDER BY stars DESC NULLS LAST, tvl DESC NULLS LAST`.               | ✓ `recomputeStarsForMint` + `searchPools`. |
| **D6** ~$1k TVL floor (perf/dust, not trust)                                                         | `POOLS_TVL_FLOOR` env, default 1000, applied at normalize time; sub-floor reachable by paste.                                                                                                                                                                | ✓ `raydium-sync.ts` (indexed venues only).                                        |

## 3. Actual API surface (the contract Mill consumes)

### Endpoint

```
GET /v1/pools/search?q=<free-text>&venue=<lane>&limit=<n>
```

- `q` **required** (missing → 400). Free-text: symbol pair (`SOL/USDC`), single symbol, mint, or pool address.
- `venue` **optional on the route** (omitted → all venues) — but `@tributary-so/pools-client` makes it **required** (`SearchPoolsOptions.venue`). Mill fixes it to `template.lane`.
- `limit` default 20, clamped 1–50.
- Response (matches the `/v1/assets` envelope):

```jsonc
{
  "success": true,
  "data": {
    "query": "SOL/USDC",
    "venue": "raydium",
    "results": [
      /* PoolResult[] */
    ]
  },
  "timestamp": 1785337802810
}
```

- **`PoolResult`** (`routes/pools.ts:34`): `{ address, venue, tokenX, tokenY, tvl, feeRate, stars, tier1, extras }`, each leg `{ mint, symbol, decimals, logoUri, tier }`. `extras` carries venue side-channels (Raydium `{"ammConfig": "<base58>"}`). **Identical for indexed and live venues** — the mode is server-internal.

### Resolver modes + sync (`pools-sync.ts` + `raydium-sync.ts` + `pools-tokens.ts`)

- **`mode: "indexed" | "live"`** — the resolver selects per venue; the route and client are mode-agnostic:
  - **indexed** — serve from the `pools` table; a normalizer syncs it on a tick. _Forced_ when the venue has no free-text upstream (Raydium).
  - **live** — forward the venue's own free-text query per request, normalize to `PoolResult`, trust-join the cached `tokens` table for stars/logos, Redis-cache. _Used_ when the venue already answers free-text (Meteora) — indexing it would be pure overhead (sync job + storage + staleness for zero UX gain).
- Orchestrator: `getSyncDb()` (dedicated `postgres()` pool, lazy, null without `DATABASE_URL`), `registerPoolNormalizer(venue, fn)` (indexed), `registerPoolResolver(venue, fn)` (live-proxy), `registerPostSyncHook(fn)`, `runPoolsSyncTick()` (**per-venue/per-hook error isolation**), `startPoolsSync(5min)` (no-op without DB or normalizers).
- Raydium normalizer (indexed): base **`https://api.raydium.io/v3/mainnet`**, `pageSize` 1000, cursor `nextPageId` (opaque, passed verbatim), retry 429/5xx (3×, backoff), 15s timeout; `normalizeRaydiumPool` (defensive read + TVL floor), idempotent `upsertPools` (`ON CONFLICT DO UPDATE`), `drainStalePools` (10-min window ≈ 2 missed ticks).
- Whirlpool normalizer (indexed): `https://api.mainnet.orca.so/v1/whirlpools` (flat full-list, no pagination); defensive multi-shape extraction; TVL floor binds only on explicit TVL (Orca REST may omit a clean USD TVL — dropping everything would defeat the normalizer).
- Meteora resolver (live): `services/meteora-resolver.ts` — forwards the query to Meteora's `/pair/all_by_groups?search_term=` (env-overridable path; defensively parsed), normalizes to `PoolSearchHit`, trust-joins inline via `resolveAsset` (Redis-cached). Live mints aren't in the indexed `tokens` table → stars derive per-query. Dispatch: `pools-search.ts` calls the live resolver when registered for the venue, else the indexed `searchPools`.
- Token refresh (post-sync hook): `refreshPoolsTokens` — `getMintsNeedingRefresh` (>1h stale, ≤200/tick), `resolveAsset` via **`tokens-proxy.ts`** (reused, not a new client), `upsertToken` (`known=!!asset`), `recomputeStarsForMint`; concurrency 5, per-mint isolation. (Live venues resolve inline at query time, not via this hook.)
- Boot (`index.ts`, in `require.main`): `registerPoolNormalizer("raydium"/"whirlpool", …)` + `registerPoolResolver("meteora", searchMeteoraLive)` + `registerPostSyncHook(refreshPoolsTokens)` + `startPoolsSync()`.

### Search / rank core (`db/pools.ts`) — indexed path

- `parseTerms`: split on `[/\-\s_]+`; base58 → mint candidates; else uppercased symbol.
- Match: a base58 candidate hits `mintA`/`mintB`/`address` (paste hatch) **OR** two symbols pair on `(symbolA,symbolB)` either order **OR** one symbol hits either leg. `venue` optional filter. Left-joins `tokens` twice (per leg). `ORDER BY stars DESC NULLS LAST, tvl DESC NULLS LAST`, `LIMIT`.
- Cache: `searchPoolsCached` — Redis key `pools:search:{venue}:{limit}:{q}`, TTL 30s, best-effort (no `REDIS_URL` → passthrough).

### Schema (`db/schema-pools.ts`, Drizzle, `pgSchema("pools")`, migration `0002`)

- `pools`: PK `(venue, address)`; `mint_a/b`, `symbol_a/b`, `tvl` (numeric), `fee_rate`, `stars` (smallint), `tier1` (bool), `extras` (jsonb), `refreshed_at`. Indexes: `symbol_a`, `symbol_b`, `(mint_a,mint_b)`, `(stars DESC, tvl DESC)`. (Live venues do not write here.)
- `tokens`: PK `mint`; `known`, `tier`, `symbol`, `name`, `decimals`, `logo_uri`, `refreshed_at`. Shared by both modes.

### Client (`packages/pools-client`)

- `createPoolsClient({ baseUrl, fetch })` → `{ searchPools(query, { venue, limit, signal }) }`; empty result on non-2xx.
- `usePoolSearch(query, { baseUrl }, { venue, enabled, limit, debounceMs=250 })` — lazy singleton client, react-query, `staleTime 30s`, `placeholderData: prev`.
- `PoolPicker` (`picker.tsx`) — venue-agnostic shell: `resolvePoolDirection`, `legMeta`, `STABLE_MINTS`, uniform **`PoolSelectHandler = (pool, srcMint, tgtMint, extras, srcMeta, tgtMeta) => void`** (the `extras` field kills the old 5-vs-6-arg `onSelect` drift). Dependency-light (no HeroUI, no Mill internals) — Mill embeds its `PoolRow` inside its own `AutocompleteItem`.

## 4. Deviations from the original plan

1. **Dedicated `packages/pools-client`**, not an extension of `tokens-client` (plan §9). It also ships the hook + picker.
2. **Drizzle ORM** + dedicated `pgSchema("pools")` (plan had raw SQL sketches).
3. **Raydium base is `api.raydium.io/v3/mainnet`**, not `api-v3.raydium.io.
4. **Client `venue` is required** (route is optional).
5. **Token refresh reuses `tokens-proxy.ts` `resolveAsset`** — no new tokens.xyz client.
6. **Separate sync DB pool** (`getSyncDb`) — explicit anti-starvation, beyond the plan.
7. **D4 softened from "index every venue" to "index where the venue lacks free-text, live-proxy where it has it."** The index was forced on Raydium (no free-text); it is pure overhead for Meteora (which has free-text). Meteora lands as a **live-proxy resolver**, not an indexer.
8. **Only Raydium is wired** (indexed). Meteora (live-proxy) + Whirlpool resolvers not yet implemented (D4 ◐).

## 5. Known issues (fix before rely)

- ~~**⚠ Type mismatch — `tvl` / `feeRate` / `venue`.**~~ **FIXED** (milestone `tributary-lgkx`): `routes/pools.ts` `toResult` coerces drizzle numeric strings → `number | null` and `venue` → `PoolVenue`. Applies to both resolver modes (coerced wherever a `PoolResult` is built).
- ~~**Meteora templates return empty**~~ **DONE** — Meteora **live-proxy resolver** landed (`services/meteora-resolver.ts`), registered as `mode: "live"` for `venue=meteora`. Whirlpool is **indexed** (`services/whirlpool-sync.ts`, bulk-list confirmed).

## 6. Remaining work (to finish the vision)

1. ~~**Meteora live-proxy resolver** (`mode: "live"`)~~ **DONE** — `services/meteora-resolver.ts`: forwards the parsed query to Meteora's free-text search (`/pair/all_by_groups?search_term=`, env-overridable — the API is unreachable from some environments so the path is isolated + defensively parsed), normalizes to `PoolSearchHit`, trust-joins inline via `resolveAsset` (Redis-cached; live mints aren't in the indexed `tokens` table, so stars derive per-query). Registered via `registerPoolResolver("meteora", …)`; dispatch lives in `pools-search.ts`.
2. ~~**Whirlpool resolver**~~ **DONE (indexed)** — Orca's bulk-list `/v1/whirlpools` exists (~17MB full list) → `mode: "indexed"`, mirrored Raydium in `services/whirlpool-sync.ts`. TVL floor binds only on explicit TVL (Orca REST may omit a clean USD TVL).
3. ~~**Fix the §5 type mismatch**~~ **DONE** — coerced at the route seam (both modes).
4. ~~**Paste-mint singleton enrichment**~~ **DONE** (milestone `tributary-lgkx`) — `services/pools-search.ts`: a pasted base58 mint matching no pool (either path), in a pinned venue, resolves via `resolveAsset` into a singleton identity row (`extras.singleton = true`); isolated + cached. Fires after both live and indexed paths.
5. ~~**Mill migration**~~ **DONE** — Mill's `apps/app` now resolves pools via `@tributary-so/pools-client` (`usePoolSearch` + `PoolRow` + `selectPool`/`impliedPoolDirection`). The per-venue `PoolAutocomplete`/`RaydiumPoolAutocomplete` clones + their libs (`pool-search`, `use-pool-search`, `raydium-pool-search`, `use-raydium-pool-search`, `pool-direction`) are deleted; `param-field.tsx` `PoolControl` is one venue-agnostic `<PoolPicker venue={lane}>`; `extras.ammConfig` is threaded into the existing `onPoolSelect` contract (so `setup-view`/`updatePool` are unchanged). Bumped `pools-client@0.1.0` / `sdk@2.3.2` / `forward-builders@1.2.1` / `tokens-client@^1.0.0`; also fixed a stale `sdk@2.0.0-beta.5` split in `tests/`. Build/typecheck/lint/tests green.
6. **Deploy + publish** — API not deployed, `@tributary-so/pools-client` not on npmjs. Mill links the workspace package until publish.
7. **Operational drilling** — per-venue cadence tuning (indexed venues), worker-split trigger if sync load threatens request-serving, drain-window tuning. (Live venues need no cadence — they answer per query.)

## 7. Acceptance (status)

| Criterion                                                                                                           | Status                                                       |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Raydium symbol search returns results (the original UX bug)                                                         | ✓ (index parse IS the symbol feature)                        |
| 2★ real pair ranks above 0★ same-symbol scam                                                                        | ✓ (`stars DESC, tvl DESC`)                                   |
| Paste arbitrary mint resolves; freedom preserved                                                                    | ✓ (singleton identity — both paths — §6.4)                   |
| Adding a venue = one resolver (indexed normalizer or live-proxy fn) + one registry line, no new client/route/branch | ✓ (orchestrator + uniform client; `mode` is server-internal) |
| Sub-floor pools absent from search, reachable by paste                                                              | ✓ (indexed venues)                                           |
| Keys never reach browser; failure stance empty-not-500                                                              | ✓                                                            |
| Meteora parity (via **live-proxy resolver**, not index)                                                             | ✓ `meteora-resolver.ts` (`mode: "live"`)                     |
| Whirlpool parity (indexed)                                                                                          | ✓ `whirlpool-sync.ts` (`mode: "indexed"`)                    |
| Mill consumes the unified picker (clones deleted)                                   | ✓ `apps/app/components/pool-picker.tsx` (pools-client)        |
| Wire types match client types                                                                                       | ✓ §5 fixed at the route seam                                 |
