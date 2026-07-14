---
# tributary-z74k
title: 'API: tsup Bundle + Multi-Stage Dockerfile'
status: completed
type: epic
priority: high
created_at: 2026-07-14T19:00:55Z
updated_at: 2026-07-14T20:48:56Z
parent: tributary-geyq
---

## Objective

Bundle `apps/api` with **tsup** and deploy via a cache-friendly, production-pruned multi-stage Docker image.

## Current state

- Build: `tsc` → `dist/`
- Start: `npx tsx src/index.ts`
- Dockerfile: **same structural defects as scheduler** — no caching, fragile selective copy of `sdk`/`payments`/`tokens-client`, ships devDeps, corepack downloads pnpm at runtime
- Workspace deps: `@tributary-so/sdk`, `@tributary-so/payments`, `@tributary-so/tokens-client`
  - sdk → `lighthouse-sdk-legacy` → `@metaplex-foundation/umi` (same resolution chain as scheduler)
- Heavier runtime deps: express, drizzle-orm, kafkajs, socket.io/redis-adapter, jose

## Tasks

1. **tsup config** — add `tsup.config.ts` for `apps/api` (format: esm). **Investigate bundling strategy:** express/drizzle/kafkajs are large — decide whether to bundle or mark `external` + ship via `pnpm deploy`. Likely: bundle app code, externalize heavy server deps.
2. **Build script** — change `build` from `tsc` to `tsup`.
3. **Dockerfile rewrite** — same pattern as scheduler:
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
    && pnpm --filter @tributary-so/tokens-client run build \
    && pnpm --filter @tributary-so/payments run build \
    && pnpm --filter @tributary-so/api run build
   RUN pnpm --filter @tributary-so/api deploy --legacy --prod /deploy

   FROM node:20-slim AS runtime
   WORKDIR /app
   ENV NODE_ENV=production
   COPY --from=builder /deploy /app
   CMD ["node", "dist/index.js"]
   ```
4. **tsx decision** — same as scheduler: verify if tsup eliminates the tsx requirement.
5. **Verify** — build image, run container, confirm API starts and serves requests.

## Acceptance criteria

- [ ] `docker build` succeeds
- [ ] Container starts without module resolution errors
- [ ] All three workspace deps (sdk, payments, tokens-client) resolve correctly in the deploy
- [ ] Image excludes devDependencies
- [ ] Source-only changes don't invalidate the dependency install layer
- [ ] No corepack runtime download
