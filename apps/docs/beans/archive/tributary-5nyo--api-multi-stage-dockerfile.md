---
# tributary-5nyo
title: 'API: Multi-Stage Dockerfile'
status: completed
type: feature
priority: high
created_at: 2026-07-14T19:23:07Z
updated_at: 2026-07-15T07:57:56Z
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

## Summary of Changes

**apps/api/Dockerfile** — full rewrite:

- Removed `pnpm deploy --legacy --prod` entirely. The tsup bundle (sibling task tributary-yc1o) is a self-contained CJS bundle (noExternal: /.\*/) — only two ws optional native addons (bufferutil, utf-8-validate) stay external and fail gracefully via try/catch. No node_modules needed at runtime. The pnpm deploy step was re-resolving 279 packages from the network on every build (~3 min) — pure dead weight.
- Runtime stage copies only dist/index.js + dist/index.js.map from the builder. Zero node_modules in the final image.
- Lockfile caching: COPY pnpm-lock.yaml + package.json, then pnpm fetch with BuildKit cache mount. Source-only changes do NOT invalidate the fetch layer (verified).
- package.json copied alongside lockfile so corepack reads the correct packageManager field (pnpm@10.28.2) instead of downloading the latest (pnpm 11, which requires Node 22+ and crashes on node:20-slim).
- CMD ["node", "dist/index.js"] — no pnpm/corepack at runtime.

Verified:

- docker build succeeds (requires DOCKER_BUILDKIT=1 for cache mount)
- Container starts, GET /v1/health returns {"status":"ok"}
- Image size: 221MB (node:20-slim base ~200MB + 20MB bundle)
- Zero node_modules at runtime
- Source-only change keeps pnpm fetch layer CACHED
