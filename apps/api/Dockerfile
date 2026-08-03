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
# swagger-jsdoc scans ./src/routes/*.ts at RUNTIME (openapi.ts `apis` glob) to
# extract @openapi JSDoc blocks — it is not a compile-time step. The tsup
# bundle inlines the code but NOT the source comments the spec is built from,
# so without these files /openapi.yaml serves `paths: {}` in production.
# Copy the route sources so the spec is populated. Long-term alternative:
# codegen the spec at build time and import a static JSON.
COPY --from=builder /app/apps/api/src/routes /app/src/routes
CMD ["node", "dist/index.js"]
