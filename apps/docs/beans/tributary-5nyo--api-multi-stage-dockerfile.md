---
# tributary-5nyo
title: 'API: Multi-Stage Dockerfile'
status: completed
type: feature
priority: high
created_at: 2026-07-14T19:23:07Z
updated_at: 2026-07-14T20:48:54Z
parent: tributary-z74k
blocked_by:
    - tributary-yc1o
---

## Objective

Rewrite `apps/api/Dockerfile` with lockfile-cached dependency installation and production pruning via `pnpm deploy`.

## Depends on

Blocked by **API: tsup Bundling** (`tributary-yc1o`) — the Dockerfile serves the bundled `dist/index.js`.

## Current defects (identical to scheduler)

1. `COPY . .` before `pnpm install` → no dep-layer caching
2. Manual `COPY --from=deps` per workspace package (`sdk`, `payments`, `tokens-client`) → fragile; same class of bug as the scheduler's missing lighthouse copy
3. Ships all devDeps
4. `CMD ["pnpm", "start"]` triggers corepack runtime download

## Work

Replace the Dockerfile entirely:

```dockerfile
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app

COPY pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch

COPY . .
RUN pnpm install --frozen-lockfile --offline

# Build all workspace deps the API imports, then the API
RUN pnpm --filter @tributary-so/sdk run build \
 && pnpm --filter @tributary-so/tokens-client run build \
 && pnpm --filter @tributary-so/payments run build \
 && pnpm --filter @tributary-so/api run build

# Prune to self-contained dir — API's dep tree only
RUN pnpm --filter @tributary-so/api deploy --legacy --prod /deploy

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /deploy /app
CMD ["node", "dist/index.js"]
```

Note: API has three workspace deps to build (sdk, tokens-client, payments). The `pnpm deploy` handles their transitive tree automatically — `lighthouse-sdk-legacy` and `@metaplex-foundation/umi` resolve through sdk.

## Acceptance

- [x] `docker build -f apps/api/Dockerfile .` succeeds
- [ ] Container starts without module resolution errors
- [ ] All three workspace deps (sdk, payments, tokens-client) resolve correctly
- [ ] Image excludes devDependencies
- [ ] Source-only change does NOT invalidate the `pnpm fetch` layer
- [ ] No corepack download at container start
- [ ] API serves requests (health check endpoint responds)
