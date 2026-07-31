/**
 * @tributary-so/pools-client
 *
 * Pure-fetch client for the Tributary `/v1/pools/search` endpoint (pool
 * resolver service). See the "Pool resolver service" milestone
 * (tributary-gq0p).
 *
 * - `types.ts`  — response shapes mirroring apps/api routes/pools.ts
 * - `client.ts` — createPoolsClient — pure fetch, no React
 */

export * from "./types";
export * from "./client";
