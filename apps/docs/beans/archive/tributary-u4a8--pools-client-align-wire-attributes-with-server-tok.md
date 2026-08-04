---
# tributary-u4a8
title: 'pools-client: align wire attributes with server (tokenX/tokenY/logoUri, not snake_case)'
status: completed
type: bug
priority: high
created_at: 2026-08-02T20:28:47Z
updated_at: 2026-08-02T20:37:01Z
---

The server (apps/api/src/routes/pools.ts) delivers pool legs as tokenX/tokenY/logoUri (camelCase). The @tributary-so/pools-client package types declare token_x/token_y/logo_uri (snake_case) — a wire contract mismatch. Any consumer of the published client would see undefined fields at runtime.

## Scope
- [ ] types.ts: PoolToken.logo_uri -> logoUri, PoolSearchResult.token_x/token_y -> tokenX/tokenY
- [ ] picker.tsx: all pool.token_x/token_y/logo_uri reads -> camelCase
- [ ] client.test.ts: fixtures -> camelCase
- [ ] picker.test.ts: fixtures -> camelCase
- [ ] react.test.ts: fixtures -> camelCase
- [ ] README.md: Types section -> camelCase
- [ ] pnpm test (all three self-checks pass)
- [ ] pnpm run build (tsc clean)
- [ ] pnpm run lint

## Out of scope
- DB SQL column names stay logo_uri (schema-pools.ts text("logo_uri") is the column mapping).
- POOL-API.md line 88 describes the DB column, not the wire.
- Historical bean bodies under apps/docs/beans are immutable.

## Summary of Changes

The server (`apps/api/src/routes/pools.ts`) delivers pool legs as `tokenX`/`tokenY`/`logoUri` (camelCase) but `@tributary-so/pools-client` declared `token_x`/`token_y`/`logo_uri` (snake_case) — a wire contract mismatch that would surface every leg field as `undefined` for any consumer.

### Files changed
- `src/types.ts` — `PoolToken.logo_uri`→`logoUri`; `PoolSearchResult.token_x/token_y`→`tokenX/tokenY`.
- `src/picker.tsx` — all `pool.token_x`/`pool.token_y`/`token.logo_uri` reads → camelCase (`legMeta`, `resolvePoolDirection`, `impliedPoolDirection`, `PoolRow`).
- `src/client.test.ts` — both fixtures (happy path + thin pool) + assertions → camelCase.
- `src/picker.test.ts` — `pool()` factory + all override fixtures (`stableX`, `noStable`, `unknown`) → camelCase.
- `src/react.test.ts` — fixture + assertion → camelCase.
- `README.md` — Types section → camelCase.

### Out of scope (intentionally untouched)
- `apps/api/src/db/schema-pools.ts` `text("logo_uri")` and `db/pools.ts` `excluded.logo_uri` — SQL column identifiers (drizzle JS name → SQL column mapping), not wire attributes.
- Comment/message strings in `picker.test.ts` referencing `token_x`/`token_y` as the pool-leg *concept* ("the X token"), not field accesses.

### Verification
- `pnpm run build` (tsc): clean
- `pnpm test`: all 3 self-checks pass (client, react hook, picker helpers)
- `pnpm run lint`: clean
