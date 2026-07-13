/**
 * @tributary-so/tokens-client
 *
 * Client + React hooks for the Tributary `/v1/assets` proxy (tokens.xyz
 * asset catalog). See ADR-0028.
 *
 * - `client.ts`     — pure fetch, no React (suitable for Node/browser/edge).
 * - `react.ts`      — react-query hooks.
 * - `devnetFallback.ts` — shared static seed + resolve fallback.
 */

export * from "./types";
export * from "./client";
export {
  MINT_OVERRIDES,
  INITIAL_TOKENS,
  lookupOverride,
  defaultMintForNetwork,
  type Network,
  type TokenMetadata,
  type TokenMetadataMap,
} from "./devnetFallback";
