---
# tributary-lb9f
title: 'Scheduler: tsup Bundling'
status: todo
type: feature
priority: high
created_at: 2026-07-14T19:22:42Z
updated_at: 2026-07-14T19:22:42Z
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
- [ ] Scheduler connects to Solana RPC and begins cron cycles
