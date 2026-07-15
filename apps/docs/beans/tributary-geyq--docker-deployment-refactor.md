---
# tributary-geyq
title: Docker Deployment Refactor
status: completed
type: milestone
priority: high
created_at: 2026-07-14T19:00:26Z
updated_at: 2026-07-15T08:37:00Z
---

## Goal

Standardize Docker builds across Tributary backend services using **tsup bundling** and **cache-friendly, production-pruned multi-stage Dockerfiles**.

## Problem

Current Dockerfiles (`apps/scheduler`, `apps/api`) share the same structural defects:

1. **No dependency-layer caching** — `COPY . .` runs *before* `pnpm install`, so every source-only edit re-runs the full install/link step.
2. **Fragile manual node_modules copy** — each workspace dependency must be explicitly `COPY --from=deps`'d into the final stage. Missing one causes `ERR_MODULE_NOT_FOUND` at runtime. **Already happened:** `packages/lighthouse` → `@metaplex-foundation/umi` in the scheduler image.
3. **DevDependencies shipped to production** — tsx, typescript, eslint, `@types/*` all in the final image (~90 MB dead weight).
4. **Corepack downloads pnpm at *runtime*** — the service's `packageManager` field (`pnpm@9.6.0`) differs from root (`pnpm@10.28.2`), so `CMD ["pnpm", "start"]` triggers a network download on every container start.

## Approach (per service)

1. Add **tsup** bundling — single-file ESM output that resolves CJS/ESM interop (directory imports etc.) at *build* time.
2. Rewrite Dockerfile:
   - `pnpm fetch` (lockfile-only) with BuildKit cache mount → survives source changes
   - `pnpm install --frozen-lockfile --offline`
   - Build workspace deps + service
   - `pnpm deploy --legacy --prod` → self-contained pruned dir (auto-resolves full transitive workspace tree)
   - Final stage: bare `node:20-slim`, no pnpm/corepack
3. **tsx decision** — if tsup resolves the `@meteora-ag/dlmm` directory-import issue at build time, drop tsx entirely. Otherwise promote tsx to `dependencies`.

## Verified (not assumed)

| Check | Result |
|-------|--------|
| `pnpm deploy --legacy --prod` carries sdk `dist/` | present |
| …carries lighthouse `dist/` | present |
| …carries `@metaplex-foundation/umi` (resolvable from lighthouse) | present |
| `tsx lib/index.js` loads fully | reached env check |
| typescript / eslint excluded by `--prod` | absent |
| plain `node lib/index.js` | FAILS — `ERR_UNSUPPORTED_DIR_IMPORT` from dlmm (tsx required until tsup) |

## Scope

- `apps/scheduler`
- `apps/api`

## Non-goals

- Application logic changes
- CI/CD pipeline changes
