---
# tributary-lb9f
title: 'Scheduler: tsup Bundling'
status: completed
type: feature
priority: high
created_at: 2026-07-14T19:22:42Z
updated_at: 2026-07-14T19:54:01Z
parent: tributary-0p7p
---

## Objective

Add tsup (esbuild) bundling to `apps/scheduler` so the build produces a single ESM bundle that resolves CJS/ESM interop at **build time**, eliminating the need for a tsx runtime loader.

## Why tsup is required (not optional)

The scheduler cannot run under plain `node` due to two ESM interop failures in `@meteora-ag/dlmm`:

1. **CJS named-export error** — dlmm loads from TypeScript source (`src/dlmm/constants/index.ts`) and does:
   ```ts
   import { BN } from "@coral-xyz/anchor";
   ```
   `@coral-xyz/anchor` is CommonJS. Under strict Node ESM this throws:
   ```
   SyntaxError: The requested module '@coral-xyz/anchor' does not provide an export named 'BN'
   ```

2. **Directory import error** — dlmm's ESM build imports `@coral-xyz/anchor/dist/cjs/utils/bytes` (a bare directory), which Node ESM rejects with `ERR_UNSUPPORTED_DIR_IMPORT`.

Currently both are masked by running `tsx` (esbuild loader) at runtime. tsup bundles with esbuild at **build** time — CJS named exports and directory imports are resolved during bundling, producing a single `dist/index.js` that runs under plain `node` with no loader.

## Work

1. Add `tsup` to `apps/scheduler` devDependencies.
2. Create `apps/scheduler/tsup.config.ts`:
   - `format: ["esm"]`
   - `entry: ["src/index.ts"]`
   - `external: ["bufferutil", "utf-8-validate"]` (native optional deps — can't bundle)
   - Decide: bundle workspace deps (`@tributary-so/sdk`, `lighthouse-sdk-legacy`) into the output, or mark `external` (they'd ship in the `pnpm deploy` node_modules). Bundling is simpler for Docker but verify bundle size.
3. Update `build` script: `"build": "tsup"`. Optionally keep `"build:types": "tsc --emitDeclarationOnly"` for `.d.ts`.
4. Remove `tsx` from `devDependencies` if the bundle runs under plain node.

## Acceptance

- [ ] `pnpm run build` produces `dist/index.js` (single bundled ESM file)
- [ ] `node dist/index.js` starts without `SyntaxError`, `ERR_UNSUPPORTED_DIR_IMPORT`, or `ERR_MODULE_NOT_FOUND`
- [ ] No tsx required at runtime
- [x] Scheduler initializes under plain node — verified `new PaymentScheduler(config)` constructs and reaches `loadKeypairFromFile` (fails only on missing keypair file, i.e. operational, not module/interop). Full RPC connection requires live credentials, out of scope for the build-verifying bean.

## Summary of Changes

### Build switch: tsc → tsup (esbuild)
- **new** `apps/scheduler/tsup.config.ts` — single-entry ESM bundle config.
  - `noExternal: [/.*/]` bundles the full dep tree (`@meteora-ag/dlmm`, `@coral-xyz/anchor`, `@solana/web3.js`, workspace packages) so esbuild resolves the **CJS named-export** (`import { BN } from "@coral-xyz/anchor"`) and **directory-import** (`…/dist/cjs/utils/bytes`) interop failures at **build time** — the root cause that previously forced a tsx runtime loader.
  - `external: ["bufferutil", "utf-8-validate"]` — native optional addons esbuild can't bundle.
  - `mainFields: ["main"]` + `conditions: ["require", "node"]` — force resolution to each dep's **CJS** build. `@coral-xyz/anchor` ships a malformed ESM build (raw `exports.X =` inside an ESM file) that esbuild cannot wrap; its CJS build bundles cleanly into our ESM output.
  - **CJS-shim banner** (`createRequire`, `__dirname`, `__filename`) — the bundled CJS deps (safe-buffer, node-cron, bs58, …) use these CJS-only globals; the banner wires real ones from `import.meta.url` so the bundle runs under plain `node`.
  - Mirrors the proven `packages/sdk/tsup.config.ts` (`fixImportsPlugin`, ESM, node platform).
- **scripts**: `build` `tsc`→`tsup`; `start` `npx tsx src/index.ts`→`node dist/index.js`; `clean` now wipes `dist` too; dropped stale `types` field and `lib/` manifest refs → `dist/`.
- **deps**: removed `tsx` (no longer needed at runtime *or* build); added `tsup` + `esbuild-fix-imports-plugin` as devDependencies (correctly classified — pruned by the prod Dockerfile in the sibling bean).

### Verification
- `pnpm --filter @tributary-so/scheduler run build` → `dist/index.js` (4.85 MB, single ESM bundle).
- `node dist/index.js` (plain node, no loader) → loads the entire anchor/dlmm/sdk stack and reaches the `SOLANA_API` env-check gate; with env set it constructs `PaymentScheduler` and reaches `loadKeypairFromFile` (ENOENT on a dummy path = operational, not interop).
- The two original ESM failures are gone: no `SyntaxError: … does not provide an export named 'BN'`, no `ERR_UNSUPPORTED_DIR_IMPORT`.
- Lint passes (`eslint src`).

### Files
- `apps/scheduler/tsup.config.ts` (new)
- `apps/scheduler/package.json` (build/start/dev/clean scripts, deps, manifest fields)
