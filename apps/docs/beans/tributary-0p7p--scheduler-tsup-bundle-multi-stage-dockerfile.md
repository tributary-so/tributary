---
# tributary-0p7p
title: 'Scheduler: tsup Bundle + Multi-Stage Dockerfile'
status: todo
type: epic
priority: high
created_at: 2026-07-14T19:00:55Z
updated_at: 2026-07-14T19:00:55Z
parent: tributary-geyq
---

## Objective

Bundle `apps/scheduler` with **tsup** and deploy via a cache-friendly, production-pruned multi-stage Docker image.

## Current state

- Build: `tsc` → `lib/`
- Start: `npx tsx src/index.ts` (tsx required — `@meteora-ag/dlmm` does a directory import that strict Node ESM rejects)
- Dockerfile: fragile selective `node_modules` copy, no caching, ships devDeps, corepack downloads pnpm at runtime
- Workspace deps: `@tributary-so/sdk` → `lighthouse-sdk-legacy` → `@metaplex-foundation/umi`

## Tasks

1. **tsup config** — add `tsup.config.ts` for `apps/scheduler` (format: esm, externalize native/optional deps: `bufferutil`, `utf-8-validate`). Target: single bundled `dist/index.js`.
2. **Build script** — change `build` from `tsc` to `tsup`. Optionally keep `tsc` as `build:types` for `.d.ts` generation.
3. **Dockerfile rewrite:**
   ```
   FROM node:20-slim AS base
   RUN corepack enable

   FROM base AS builder
   WORKDIR /app
   COPY pnpm-lock.yaml ./
   RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch
   COPY . .
   RUN pnpm install --frozen-lockfile --offline
   RUN pnpm --filter @tributary-so/sdk run build \
    && pnpm --filter @tributary-so/scheduler run build
   RUN pnpm --filter @tributary-so/scheduler deploy --legacy --prod /deploy

   FROM node:20-slim AS runtime
   WORKDIR /app
   ENV NODE_ENV=production
   COPY --from=builder /deploy /app
   CMD ["node", "dist/index.js"]
   ```
4. **tsx decision** — test `node dist/index.js` (no loader). If the tsup bundle resolves dlmm's directory import at build time, **drop tsx entirely**. Otherwise promote tsx to `dependencies` and use `CMD ["./node_modules/.bin/tsx", "dist/index.js"]`.
5. **Verify** — build image, run container, confirm scheduler starts and connects to Solana RPC.

## Acceptance criteria

- [ ] `docker build` succeeds
- [ ] Container starts without `ERR_MODULE_NOT_FOUND` or `ERR_UNSUPPORTED_DIR_IMPORT`
- [ ] Image excludes devDependencies (no typescript/eslint in final layer)
- [ ] Source-only changes don't invalidate the dependency install layer
- [ ] No corepack runtime download
