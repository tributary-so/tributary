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

RUN pnpm --filter @tributary-so/sdk run build \
 && pnpm --filter @tributary-so/scheduler run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/scheduler/dist/index.js /app/dist/index.js
COPY --from=builder /app/apps/scheduler/dist/index.js.map /app/dist/index.js.map
CMD ["node", "dist/index.js"]
