---
# tributary-4nly
title: 'forward-builders: browser-safe config subpath (no venue SDK / wasm in browser graph)'
status: completed
type: feature
priority: normal
created_at: 2026-07-29T12:18:39Z
updated_at: 2026-07-29T12:39:13Z
---

# Browser-safe config subpath for @tributary-so/forward-builders

## Context (from TRIBUTARY-WASM-FIX.md — preserved)

`@tributary-so/forward-builders` ships a SINGLE tsup entry (`src/index.ts`)
that statically imports every venue SDK file. `index.ts` top-level
`export { createWhirlpoolForward, ... } from "./whirlpool"` is a static
module-graph edge. `whirlpool.ts` imports `@orca-so/whirlpools` (line 1) and
`@solana/kit` (line 6), with a module-top-level `address(...)` call (line 20),
and `@orca-so/whirlpools-core`'s browser build opens with
`import * as wasm from "./....wasm"` — which Vite refuses to transform.

Any browser consumer that imports the cheapest pure config symbol from the
main entry (e.g. `meteoraDlmmForwardConfig`) drags the entire venue-SDK graph
+ the Orca wasm into its bundle. Tree-shaking cannot help: the wasm `import`
is a top-level side effect in the same module. In dev, Vite `optimizeDeps`
pre-bundles the whole dependency.

**The scheduler fix (9cf1b761)** solves the OPPOSITE runtime (Node, dist/nodejs
wasm via fs.readFileSync; fix = tsup onSuccess copies *.wasm into dist/). It
does NOT apply to the browser path. Same dep, opposite ends.

## The fix

Add a **config-only subpath** `@tributary-so/forward-builders/config` exporting
ONLY the pure setup-time symbols (pubkeys, discriminators, *ForwardConfig
builders + option types) with ZERO venue-SDK imports. Keep fire-time builders
(create*Forward, getForwardBuilderFor, createSwapWhenBalanceLow*) on the
existing main entry for Node consumers (scheduler). Browser/setup-only
consumers import the subpath; the wasm never enters their graph.

### Verified facts (this session, against actual code)

- All 4 config fns are PURE of venue-SDK symbols in their bodies:
  - meteoraDlmmForwardConfig / raydiumCpmm/ClmmForwardConfig: sync, use only
    PublicKey + discriminator + ForwardConfig type. Zero venue SDK.
  - whirlpoolForwardConfig: async (one getAccountInfo to derive aToB), uses
    zero @orca-so/@solana/kit symbols — only WHIRLPOOL_PUBKEY + discriminator.
- Each discriminator is used ONLY inside its config fn → moves cleanly to config.
- CORRECTION to fix-doc §5.2: discriminators are NOT in constants.ts; they are
  inline in each venue file. constants.ts holds only the 4 *_PUBKEY consts.
  Extraction must also move each discriminator + offset consts into config/.
- IN-REPO consumer already hit by this: apps/showcase-topup-sol (Vite browser)
  imports meteoraDlmmForwardConfig from the MAIN entry. Must migrate to /config.
- Scheduler imports ONLY getForwardBuilderFor (fire-time) from main entry →
  unaffected. Docker baseline build verified working (image boots, wasm copied).

## Acceptance criteria (from fix-doc §9)

1. `/config` subpath published, exports exactly the pure surface.
2. `import { whirlpoolForwardConfig } from ".../config"` loads WITHOUT resolving
   @orca-so/whirlpools, @orca-so/whirlpools-core, or @solana/kit — zero
   venue-SDK edges (verified via built bundle / madge).
3. Main entry still exports all symbols unchanged; scheduler build + 9cf1b761
   wasm-copy still works (scheduler Docker image builds).
4. Browser app importing only /config builds under stock Vite.
5. forward-builders unit tests pass; config-fn tests live next to src/config/.

## TDD checklist

- [x] Create src/config/<venue>.ts (4 files) — pure config surface, zero venue-SDK imports
- [x] Create src/config.ts barrel
- [x] Wire venue files: remove config code, re-export from ../config/, import for recipes
- [x] Move config describe blocks to src/config/<venue>.test.ts (4 files)
- [x] Clean orphan imports in original test files
- [x] tsup.config.ts: add config.ts entry + @orca-so/whirlpools/@solana/kit externals
- [x] package.json: add "./config" export map
- [x] index.ts stays UNCHANGED (re-exports keep main entry surface)
- [x] CHANGELOG entry
- [x] Migrate apps/showcase-topup-sol to /config subpath
- [x] Build forward-builders + run jest → green (8 suites / 52 tests)
- [x] Verify zero venue-SDK edges on /config (bundle scan: config.js → chunk → @solana/web3.js only)
- [x] Build scheduler Docker image → still boots + wasm copied (tributary-scheduler:verify)

## Summary of Changes

Implemented the browser-safe `@tributary-so/forward-builders/config` subpath
(TRIBUTARY-WASM-FIX.md). Pure setup-time symbols (4 pubkeys, 4 discriminators,
4 `*ForwardConfig` builders + option types) now live under
`src/config/<venue>.ts` and are re-exported via the new `src/config.ts` barrel;
the main entry (`"."`) is byte-for-byte unchanged in its public surface (venue
files re-export the moved symbols, so `index.ts` was not touched).

### Files
- NEW `src/config/{meteora-dlmm,raydium-cpmm,raydium-clmm,whirlpool}.ts` — pure
  config modules (zero venue-SDK imports; whirlpool config does one getAccountInfo).
- NEW `src/config.ts` — barrel for the `/config` subpath.
- NEW `src/config/*.test.ts` (4) — config-fn tests relocated next to the modules.
- MOD venue files (`meteora-dlmm/raydium-cpmm/raydium-clmm/whirlpool.ts`) — config
  code removed, re-exported from `./config/<venue>`; recipes import the fn.
- MOD venue test files — config `describe` blocks + orphan imports removed.
- MOD `tsup.config.ts` — 2nd entry `./src/config.ts`; `@orca-so/whirlpools` +
  `@solana/kit` added to `external`.
- MOD `package.json` — `./config` export map (additive; `"."` unchanged).
- MOD `CHANGELOG.md` — feature entry.
- MOD `apps/showcase-topup-sol/src/hooks/useCreateTopupPolicy.ts` — migrated to
  `/config` (the in-repo browser consumer that was hitting the wasm graph).

### Verification
- `pnpm --filter @tributary-so/forward-builders build` → clean (config.js 789 B,
  index.js 13.6 KB; both .d.ts emitted).
- `pnpm --filter @tributary-so/forward-builders test` → 8 suites / 52 tests pass.
- Zero-edge proof: built `config.js` imports only `./chunk-*.js`, which imports
  only `@solana/web3.js`. No `@meteora-ag`/`@raydium-io`/`@orca-so`/`@solana/kit`/
  `.wasm` reachable from `/config`. (acceptance #2)
- Main entry still exports all symbols incl. config re-exports; venue SDKs
  remain on `index.js` for the Node/scheduler path. (acceptance #3)
- Scheduler Docker image rebuilt (`tributary-scheduler:verify`): 7.09 MB bundle,
  `orca_whirlpools_core_js_bindings_bg.wasm` (160 KB) copied into dist via the
  `9cf1b761` mechanism, boots clean. Scheduler unaffected (imports only
  `getForwardBuilderFor` from the main entry).

### Note
No ADR added: this is an additive packaging change fully within the scope of
ADR-0030 ("SDK gains zero forward-program deps") extended to the consumer axis.
Mill-side migration (fix-doc §7) is gated on this release landing on npm.
