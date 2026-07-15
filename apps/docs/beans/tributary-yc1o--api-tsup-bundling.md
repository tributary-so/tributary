---
# tributary-yc1o
title: 'API: tsup Bundling'
status: completed
type: feature
priority: high
created_at: 2026-07-14T19:22:42Z
updated_at: 2026-07-14T20:15:30Z
parent: tributary-z74k
---

## Objective

Add tsup (esbuild) bundling to `apps/api` so the build produces an ESM bundle that resolves CJS/ESM interop at **build time**, eliminating the need for a tsx runtime loader.

## Why tsup is required (not optional)

Same root cause as the scheduler: `@meteora-ag/dlmm` (pulled in via `@tributary-so/sdk` → `lighthouse-sdk-legacy`) loads from TypeScript source and does `import { BN } from "@coral-xyz/anchor"` — a named import from a CJS module that fails under strict Node ESM:
```
SyntaxError: The requested module '@coral-xyz/anchor' does not provide an export named 'BN'
```

Currently masked by running `tsx` at runtime. tsup resolves this at build time.

## Work

1. Add `tsup` to `apps/api` devDependencies.
2. Create `apps/api/tsup.config.ts`:
   - `format: ["esm"]`
   - `entry: ["src/index.ts"]`
   - `external: ["bufferutil", "utf-8-validate"]`
   - **Bundling strategy decision:** API has heavy server deps (express, drizzle-orm, kafkajs, socket.io). Options:
     - **Bundle everything** — simplest for Docker (single file), but large output and risk of bundling issues with dynamic imports.
     - **Bundle app code, externalize server deps** — mark express/drizzle/kafkajs/etc as `external`. They ship in `pnpm deploy` node_modules. More resilient.
   - Recommend: start with externalizing known-heavy deps, bundle the rest.
3. Update `build` script: `"build": "tsup"`.
4. Remove `tsx` from `devDependencies` if the bundle runs under plain node.

## Acceptance

- [x] `pnpm run build` produces `dist/index.js` (bundled CJS, self-contained)
- [x] `node dist/index.js` starts — verified, serves requests (200 on / and /v1/health)
- [x] No tsx required at runtime (`start` = `node dist/index.js`); tsx stays in devDeps for `dev` and `db:test` scripts
- [x] API serves requests — `GET /` → 200, `GET /v1/health` → {"status":"ok"}

## Summary of Changes

- **`apps/api/tsup.config.ts`** (new): tsup config producing a single self-contained CJS bundle (`dist/index.js`, ~8MB). Bundles app code, workspace deps (`@tributary-so/*`), and ALL transitive npm deps (including `@metaplex-foundation/*`, `@coral-xyz/anchor` via the SDK). Only ws optional native addons (`bufferutil`, `utf-8-validate`) stay external.
- **`apps/api/package.json`**: `build` → `tsup`, `start` → `node dist/index.js` (was `npx tsx src/index.ts`). Added `tsup` to devDeps. Added `bn.js` to deps (directly imported by `src/db/merchant.ts`, was previously relying on transitive resolution).

### Key decision: CJS, not ESM

The bean suggested `format: ["esm"]`. Switched to **CJS** because:
1. The API imports CJS server deps (dotenv, express, kafkajs) that use dynamic `require()` — bundling those into ESM throws `Dynamic require of "fs" is not supported`.
2. CJS resolves all CJS/ESM interop at build time AND runtime — no shims, no `type: "module"` needed.
3. `require.main === module` works natively in CJS (no ESM entry-point detection rewrite needed).

### Key decision: bundle everything (not externalize)

Initial attempt externalized npm deps and bundled only workspace packages. Failed because `pnpm deploy --legacy --prod` doesn't properly hoist transitive workspace deps (`@metaplex-foundation/*` via `@tributary-so/sdk` → `lighthouse-sdk-legacy`). Bundling everything sidesteps the hoist gap entirely — the bundle is self-contained, Docker needs no node_modules for the API.
