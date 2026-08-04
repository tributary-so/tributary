---
# tributary-vzmy
title: 'Scheduler: Multi-Stage Dockerfile'
status: completed
type: feature
priority: high
created_at: 2026-07-14T19:23:07Z
updated_at: 2026-07-14T20:23:18Z
parent: tributary-0p7p
blocked_by:
    - tributary-lb9f
---

## Objective

Rewrite `apps/scheduler/Dockerfile` with lockfile-cached dependency installation and production pruning via `pnpm deploy`.

## Depends on

Blocked by **Scheduler: tsup Bundling** (`tributary-lb9f`) — the Dockerfile serves the bundled `dist/index.js`.

## Current defects (all fixed by this rewrite)

1. `COPY . .` before `pnpm install` → no dep-layer caching, every source change re-runs install
2. Manual `COPY --from=deps` per workspace package → fragile, already caused `ERR_MODULE_NOT_FOUND` for `@metaplex-foundation/umi` (forgot to copy `packages/lighthouse`)
3. Ships all devDeps (tsx, typescript, eslint, @types/*) → ~90 MB dead weight
4. `CMD ["pnpm", "start"]` triggers corepack runtime download of `pnpm@9.6.0` (mismatched with root `10.28.2`)

## Work

Replace the Dockerfile entirely:

```dockerfile
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app

# Lockfile-only fetch → cached across source-only changes
COPY pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch

COPY . .
RUN pnpm install --frozen-lockfile --offline

# Build workspace deps the scheduler imports, then the scheduler
RUN pnpm --filter @tributary-so/sdk run build \
 && pnpm --filter @tributary-so/scheduler run build

# Prune to self-contained dir — scheduler's dep tree only
RUN pnpm --filter @tributary-so/scheduler deploy --legacy --prod /deploy

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /deploy /app
CMD ["node", "dist/index.js"]
```

Key properties:
- `pnpm deploy --legacy --prod` auto-resolves the full transitive workspace tree (sdk dist, lighthouse dist, `@metaplex-foundation/umi`) — no manual `COPY` enumeration.
- Runtime is bare `node:20-slim` — no pnpm, no corepack, no runtime download.
- If the tsup bundle did NOT fully resolve interop, fall back to `CMD ["./node_modules/.bin/tsx", "dist/index.js"]` and keep tsx in `dependencies`. But tsup should make this unnecessary.

## Acceptance

- [x] `docker build -f apps/scheduler/Dockerfile .` succeeds
- [x] Container starts without `ERR_MODULE_NOT_FOUND`, `ERR_UNSUPPORTED_DIR_IMPORT`, or `SyntaxError`
- [x] Image excludes devDependencies (verify: no `typescript` or `eslint` in final layer)
- [x] Source-only `.ts` change does NOT invalidate the `pnpm fetch` layer
- [x] No corepack download at container start

## Summary of Changes

Rewrote `apps/scheduler/Dockerfile` as a three-stage build (base → builder → runtime):

- **Lockfile-cached deps:** `COPY pnpm-lock.yaml package.json` + `pnpm fetch` with BuildKit cache mount before `COPY . .` — source-only `.ts` edits no longer invalidate the install layer.
- **Production pruning:** `pnpm --filter @tributary-so/scheduler deploy --legacy --prod /deploy` auto-resolves the full transitive workspace tree (sdk dist, lighthouse dist, `@metaplex-foundation/umi`) — no manual `COPY --from=deps` per package.
- **DevDeps excluded:** verified `typescript`, `eslint`, `tsx`, `tsc` all absent from the final image.
- **No corepack at runtime:** final stage is bare `node:20-slim`, `CMD ["node", "dist/index.js"]` — no pnpm/corepack, no runtime download.

**Deviation from spec (necessary fix):** added `package.json` to the pre-`fetch` `COPY`. Without it, corepack can't read the `packageManager` pin and downloads `pnpm@11.13.0` (latest), which requires Node 22+ and crashes on `node:sqlite`. The `package.json` doesn't change on source-only edits, so the cache property holds.

**Verified:**
- `docker build` → EXIT 0, image 297 MB
- `docker run` → boots cleanly to `SOLANA_API required` env check (no `ERR_MODULE_NOT_FOUND`, `ERR_UNSUPPORTED_DIR_IMPORT`, or `SyntaxError`)
