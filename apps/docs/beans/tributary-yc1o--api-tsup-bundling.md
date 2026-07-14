---
# tributary-yc1o
title: 'API: tsup Bundling'
status: todo
type: feature
priority: high
created_at: 2026-07-14T19:22:42Z
updated_at: 2026-07-14T19:22:42Z
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

- [ ] `pnpm run build` produces `dist/index.js` (bundled ESM)
- [ ] `node dist/index.js` starts without module resolution errors
- [ ] No tsx required at runtime
- [ ] API serves requests (health check, routes respond)
