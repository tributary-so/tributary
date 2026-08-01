---
# tributary-gq0p
title: Pool resolver service — free-text pool search with trust enrichment (Raydium-first)
status: completed
type: milestone
priority: high
created_at: 2026-07-29T19:08:06Z
updated_at: 2026-07-30T13:23:38Z
---

Server-side multi-venue pool resolver. Free-text → ranked REAL pools, with
tokens.xyz trust enrichment (stars / tier1) as a ranking signal, NEVER a gate.
Raised from the Mill UX Raydium symbol-search bug (Raydium API v3 has no
free-text/symbol pool search — only mint-based — so typing a symbol no-ops).
Built **Raydium-first**; Meteora (already has free-text) and Whirlpool
(bulk-list availability TBD) land later as additional normalizers.

## Architecture decisions (grilling 2026-07-29 — LOCKED)

These supersede any prior design doc. The fleet inherits ONLY this body.

- **Q1 — Separate service.** The resolver is its OWN service (scaffold
  `apps/pools-api`), NOT in-process inside `apps/api`. Keeps the crawler out of
  request-serving; honest bounded context. The existing wsService / kafkaConsumer
  boot pattern in apps/api is *reactive*, not a fit for proactive sync.
- **Q2 — Schema isolation, not a separate DB.** Same Postgres instance; one
  dedicated SCHEMA per data owner (not a second database).
- **Q3 — Dedicated `pools` schema.** The pools service owns + migrates a
  `pools` schema (tables `pools`, `tokens`). Parallel to apps/api's own `api`
  schema (tracked separately in bean tributary-u5mz). Single-owner migrations.
  Do NOT put pools tables in the `api` schema.
- **Q4 — Pools service talks to tokens.xyz DIRECTLY.** It owns its tokens.xyz
  client + API key + `tokens` table. apps/api's `/v1/assets` proxy is UNTOUCHED
  — it stays the live per-mint identity proxy for the paste-mint escape hatch.
  Two server-side key holders is fine: ADR-0028 is about browser-hiding, not
  single-holder. The two token representations are DIFFERENT bounded contexts
  (coarse hourly star-ranking vs live identity), not competing authorities.
- **Q5 — Separate `packages/pools-client`.** Thin fetch + react-query client
  mirroring tokens-client's shape. NOT merged into tokens-client (whose domain
  is token trust/identity).
- **Q6 — Raydium-first.** Build the full pipeline (schema → service →
  normalizer → star-precompute → search → client → Mill picker) end-to-end on
  Raydium CLMM first. Unified client ships day one — no client-clone regression.
  Meteora/Whirlpool = one sync job + one normalizer + one registry line each.

## HANDOFF

### 1. Happy Path

1. User types free-text ("SOL/USDC", a symbol, a mint, or a pool address) in the Mill picker.
2. `pools-client` `usePoolSearch(q, { venue: template.lane })` → `GET /v1/pools/search?q=...&venue=raydium` on the pools service.
3. Service parses q, queries the pre-synced + star-precomputed `pools` index, ranks by (stars DESC, tvl DESC), Redis-caches ~30s.
4. Response: ranked real Raydium pools with token_x/token_y identity + stars/tier1.
5. Mill renders normalized rows; `onSelect` emits uniform `(pool, srcMint, tgtMint, extras, srcMeta, tgtMeta)`.
6. Paste-mint escape hatch: arbitrary mint resolves (singleton) via apps/api `/v1/assets`, then searches pools.

### 2. Data Contract

- **HTTP** — `GET /v1/pools/search?q=<free-text>&venue=<meteora|raydium|whirlpool>&limit=<n>`
  - envelope: `{ success, data: { query, venue, results: [ { address, venue, token_x: {mint,symbol,decimals,logo_uri,tier}, token_y: {...}, tvl, feeRate, stars, tier1, extras } ] }, timestamp }`
  - failure stance (ADR-0028 D3): upstream/sync error → `200` with `results: []` (empty, NOT 500).
  - IP rate-limit + Redis per-(q, venue, limit) cache ~30s.
- **Postgres `pools` schema:**
  - `pools(address, venue, mint_a, mint_b, symbol_a, symbol_b, tvl NUMERIC, fee_rate NUMERIC, stars SMALLINT, tier1 BOOL, extras JSONB, refreshed_at)` PK(venue, address); indexes on symbol_a, symbol_b, (mint_a, mint_b), (stars DESC, tvl DESC).
  - `tokens(mint PK, known BOOL, tier, symbol, name, decimals, logo_uri, refreshed_at)`.
- **pools-client** — `createPoolsClient({ baseUrl, fetch? })` → `{ searchPools(query, opts?) }`; `usePoolSearch(query, { venue, enabled })`.
- **Modules** — new `apps/pools-api/` (mirror apps/api posture: Express, drizzle, redis.ts, middleware); new `packages/pools-client/`.

### 3. Edge Cases & Constraints

- **Raydium has no free-text upstream** — free-text→pool parity is ONLY possible off the cached `pools` index. The index is mandatory.
- **TVL floor ≈ $1k at sync** — perf/dust cut on the proactive search surface; NOT a trust cut (stars handle trust) and NOT a user-choice cut (paste-mint still reaches sub-floor pools via the live mint endpoint). KNOWN GAP: a TVL-inflated scam of a real pair can still outrank a thin legit pool above the floor — folds into ranking refinements (Open Q).
- **tokens.xyz is a trust/recommendation layer, NEVER a gate.** Users can always paste a mint; every mint resolves to something (singleton `solana-<mint>`).
- **Keys server-side only.** Pools service holds tokens.xyz + venue keys; the browser never sees them.
- **`pools` index is mainnet-only.** Devnet degrades to base58 paste; `ammConfig` resolved by the composer from the pool account on a Surfpool mainnet fork.
- **DO NOT** touch apps/api `/v1/assets`. **DO NOT** merge into tokens-client. **DO NOT** put pools tables in the `api` schema.

### 4. Business Logic (star precompute, pseudo)

```
for each synced pool row (mint_a, mint_b):
  a = tokens[mint_a]   # { known, tier }
  b = tokens[mint_b]
  stars = (a?.known ? 1 : 0) + (b?.known ? 1 : 0)   # 0|1|2
  tier1 = (a?.tier === 'tier1') || (b?.tier === 'tier1')
  write pools.{ stars, tier1 }
# when a tokens row changes, recompute stars for pools touching that mint
# rank: ORDER BY stars DESC, tvl DESC
```

### 5. Definition of Done

- [ ] `GET /v1/pools/search?q=SOL/USDC&venue=raydium` returns ranked Raydium pools; real pair 2★ above same-symbol 0★ scams.
- [ ] Typing a SYMBOL in the Raydium picker returns results (the original bug) — no different from Meteora.
- [ ] Pasting an arbitrary (uncurated) mint still resolves + finds its pools.
- [ ] Adding a venue = one sync job + one normalizer + one registry line; NO new client component, NO new API route, NO `if (lane === …)` branch.
- [ ] `pools` rows below the TVL floor are absent from search but reachable by paste.
- [ ] Keys never reach the browser; failure stance is empty-not-500.
- [ ] pools-client + pools service are SEPARATE from tokens-client / apps/api.
- [ ] lint clean, build green, tests pass.

### 6. Test Matrix (Given / When / Then)

- Given `SOL/USDC` free-text, When `venue=raydium`, Then the real pool ranks above a same-symbol scam (stars).
- Given a symbol query, When `venue=raydium`, Then results are returned (bug-fix assertion).
- Given an arbitrary uncurated mint paste, When searched, Then singleton-resolved + pools found.
- Given an upstream/sync failure, When search is called, Then `200` + `results: []`.
- Given a pool below the TVL floor, When searched, Then absent; When pasted, Then reachable.
- Given a `tokens` refresh that changes a mint's tier, When the refresh completes, Then affected pools' stars are recomputed.

### 7. Open Questions (record an assumption and proceed; do not freeze)

- Sync cadence exact value per venue (target ~5 min), cursor/pagination robustness, backoff on 429/5xx, partial-sync reconciliation. Assume 5 min to start; measure.
- Meteora `query`-optional confirmation (deferred — Raydium-first; confirm on first Meteora sync).
- Whirlpool bulk-list availability (deferred — Whirlpool lands when confirmed; if none, `PoolSource` gains `queryMode: "indexed" | "live-mintpair"`).
- Ranking refinements beyond (stars, tvl): volume24h, fee-tier preference. Defer; ship stars + tvl first.
- Worker-split trigger WITHIN the pools service (in-process sync vs dedicated worker). N/A at start; revisit if sync load threatens request-serving.
- Formal numbered ADR: cut once operational drilling concludes.


### REWRITTEN SCOPE (2026-07-29 — supersedes Q1; amends HANDOFF section 2 & 3)

**Q1 REVERSED. No new app.** The pool resolver lives INSIDE `apps/api`:
- **Endpoints** mount under apps/api as `/v1/pools/*` (new `routes/pools.ts`, registered in `routes/index.ts` alongside `assetsRouter`). apps/api already serves the API — no second app.
- **Sync + indexing** run as an in-process service MODULE (new `services/pools-sync.ts`), booted alongside `wsService` / `kafkaConsumer` in `index.ts`. Same process, same deploy.
- **Data layer** is a new `db/pools.ts` against the `pools` schema; apps/api OWNS + migrates the `pools` schema (its own drizzle migration, like `webhooks` / `signing_keys` — NOT the foreign read-only `events` table).
- **Connection consequence (was risk #2, now load-bearing):** `db/index.ts` runs `max: 1`. A background sync job sharing that single connection serializes against request-serving. The sync module MUST use a DEDICATED postgres pool (a separate `postgres()` instance), never the `max:1` request client.
- **tokens.xyz reuse:** the pools token-refresh reuses apps/api's existing upstream client (`services/tokens-proxy.ts`) rather than a new client — same service now. `/v1/assets` stays untouched; Q4's 'direct' intent is satisfied because apps/api IS the server-side holder.

Q2 (schema isolation), Q3 (`pools` schema), Q5 (separate pools-client), Q6 (Raydium-first) STAND. `pools-client` simply points at apps/api's `/v1/pools/search` origin (same baseUrl as `tokens-client`).
