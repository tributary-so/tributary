FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="/pnpm:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app

# Lockfile + package.json (carries packageManager pin) → cached across
# source-only changes. Without package.json corepack grabs the latest pnpm.
COPY pnpm-lock.yaml package.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch

COPY . .
RUN pnpm install --frozen-lockfile --offline

# Build workspace deps the scheduler imports, then the scheduler itself
RUN pnpm --filter @tributary-so/sdk run build \
 && pnpm --filter @tributary-so/scheduler run build

# Prune to a self-contained dir — scheduler's transitive dep tree only.
# pnpm deploy auto-resolves the full workspace tree (sdk dist, lighthouse
# dist, @metaplex-foundation/umi) — no manual node_modules enumeration.
RUN pnpm --filter @tributary-so/scheduler deploy --legacy --prod /deploy

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /deploy /app
CMD ["node", "dist/index.js"]
