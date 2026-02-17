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

WORKDIR /app/api
RUN pnpm run build

FROM base AS build
COPY . /app
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/packages/sdk/node_modules /app/packages/sdk/node_modules
COPY --from=deps /app/packages/payments/node_modules /app/packages/payments/node_modules
COPY --from=deps /app/api/node_modules /app/api/node_modules

WORKDIR /app/api
CMD [ "pnpm", "start" ]
