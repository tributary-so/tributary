FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY scheduler/package.json ./scheduler/package.json
COPY sdk/package.json ./sdk/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install

FROM base AS build
COPY . /app
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/sdk/node_modules /app/sdk/node_modules
COPY --from=deps /app/scheduler/node_modules /app/scheduler/node_modules
WORKDIR /app/sdk
RUN pnpm run build

WORKDIR /app/scheduler
CMD [ "pnpm", "start" ]
