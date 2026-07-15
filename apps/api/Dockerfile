FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app

COPY pnpm-lock.yaml package.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch

COPY . .
RUN pnpm install --frozen-lockfile --offline

RUN pnpm --filter @tributary-so/sdk run build \
 && pnpm --filter @tributary-so/tokens-client run build \
 && pnpm --filter @tributary-so/payments run build \
 && pnpm --filter @tributary-so/api run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist/index.js /app/dist/index.js
COPY --from=builder /app/apps/api/dist/index.js.map /app/dist/index.js.map
CMD ["node", "dist/index.js"]
