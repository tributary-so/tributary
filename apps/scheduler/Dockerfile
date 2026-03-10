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

WORKDIR /app/apps/scheduler
RUN pnpm run build

FROM base AS build
COPY . /app
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/packages/sdk /app/packages/sdk
COPY --from=deps /app/apps/scheduler/node_modules /app/apps/scheduler/node_modules

WORKDIR /app/apps/scheduler
CMD [ "pnpm", "start" ]
