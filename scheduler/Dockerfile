FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
# Copy all workspace packages
COPY scheduler ./scheduler
COPY sdk ./sdk
COPY programs ./programs
# Install all dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install

FROM base AS build
# Copy workspace files and dependencies
COPY --from=deps / /
WORKDIR /scheduler
RUN pnpm run build

FROM base AS prod-deps
WORKDIR /
# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
# Copy all workspace packages (needed for workspace dependencies)
COPY scheduler ./scheduler
COPY sdk ./sdk
COPY programs ./programs
# Install only production dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod

FROM base
WORKDIR /scheduler
# Copy production dependencies
#COPY --from=prod-deps /scheduler/node_modules ./node_modules
COPY --from=prod-deps /node_modules /node_modules
# Copy built application
COPY --from=build /scheduler/lib ./lib
COPY --from=build /scheduler/package.json ./package.json
EXPOSE 8000
CMD [ "pnpm", "start" ]
