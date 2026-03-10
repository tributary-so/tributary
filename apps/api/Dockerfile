FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install

WORKDIR /app/packages/sdk
RUN pnpm run build

WORKDIR /app/packages/payments
RUN pnpm run build

WORKDIR /app/apps/api
RUN pnpm run build

FROM base AS build
COPY . /app
COPY --from=deps /app/packages/sdk /app/packages/sdk
COPY --from=deps /app/packages/payments /app/packages/payments
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/api/node_modules /app/apps/api/node_modules

WORKDIR /app/apps/api
CMD [ "pnpm", "start" ]
