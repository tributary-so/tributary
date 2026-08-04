---
# tributary-h7v1
title: Pool token symbol shadowed by synthetic tokens.xyz placeholder
status: completed
type: bug
priority: normal
created_at: 2026-08-03T00:25:05Z
updated_at: 2026-08-03T00:25:58Z
---

GET /v1/pools/search rendered a pool's real venue symbol (e.g. MOON) as a truncated-mint placeholder (e.g. "8zTZ..."). Two causes: (1) resolveAsset fabricated mint.slice(0,4)+"..." to satisfy a non-null ResolveResult.symbol type, persisted into the tokens table; (2) toLeg preferred token.symbol over the venue symbol, so the stale/garbage token row shadowed the pool's real symbolA/symbolB. Fix: venue-first symbol precedence in toLeg; resolveAsset returns null (no slice) and builds a row only when upstream yields something rankable; known=false for null-asset mints; widen ResolveResult.symbol + TokenMetadata.symbol to string|null (app getTokenSymbolAtom already slices on null).

## Summary of Changes

- `routes/pools.ts` `toLeg`: venue symbol is now primary (`venueSymbol ?? token?.symbol ?? null`); a tokens.xyz registry gap can no longer shadow the symbol the pool already carries.
- `services/tokens-proxy.ts` `resolveAsset`: returns `symbol: null` (no mint-slice) when no source has one; builds a row only when upstream yields something rankable (`tier || symbol || name || assetId`), so an empty body is a true miss → `MINT_OVERRIDES`.
- `services/pools-tokens.ts`: `known` is `false` for genuinely-unknown (null-asset) mints, not `true`.
- `packages/tokens-client` `types.ts` + `devnetFallback.ts`: widened `ResolveResult.symbol` and `TokenMetadata.symbol` to `string | null` (the app's `getTokenSymbolAtom` already renders a display fallback on null).
- `routes/assets.ts`: inlined the `/v1/assets/resolve` response schema with nullable `symbol` (resolves a pre-existing dangling `$ref`).
- Tests: corrected the `tokens-proxy` mock to the real nested `{variant, asset}` envelope; added a venue-first symbol regression test mirroring the MOON/SPCX case.

## Verification

- API jest: 24 suites / 303 tests pass (incl. new regression test).
- `tokens-client` build + self-tests pass.
- API `tsc --noEmit` and app `tsc -b`: clean.

## Follow-ups (deferred)

- On-chain (Metaplex) symbol as an additional identity source for symbolless mints; `packages/sdk/src/utils.ts` already exposes `getTokenSymbol()`. New bean.
- Stale `tokens.symbol` rows holding legacy slice placeholders self-heal via the refresh loop; optional one-shot backfill `UPDATE pools.tokens SET symbol = NULL WHERE symbol ~ '^[A-Za-z0-9]{1,4}\.\.\.$';`.
