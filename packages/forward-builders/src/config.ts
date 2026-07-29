// Browser-safe setup-time surface for Tributary composable forwards.
//
// This entry exports ONLY pure symbols: pubkey constants, instruction
// discriminators, and the *ForwardConfig constraint builders (+ their option
// types). Nothing here imports a venue SDK (@meteora-ag/dlmm,
// @raydium-io/raydium-sdk-v2, @orca-so/whirlpools, @solana/kit), so a browser
// consumer importing "@tributary-so/forward-builders/config" pulls ZERO
// venue-SDK wasm into its Vite graph. The fire-time builders stay on the main
// entry (".") for Node consumers (scheduler). See TRIBUTARY-WASM-FIX.md.

export {
  METEORA_DLMM_PUBKEY,
  RAYDIUM_CPMM_PUBKEY,
  RAYDIUM_CLMM_PUBKEY,
  WHIRLPOOL_PUBKEY,
} from "./constants";
export {
  meteoraDlmmForwardConfig,
  METEORA_DLMM_SWAP_DISCRIMINATOR,
  type MeteoraDlmmForwardConfigOptions,
} from "./config/meteora-dlmm";
export {
  raydiumCpmmForwardConfig,
  RAYDIUM_CPMM_SWAP_BASE_INPUT_DISCRIMINATOR,
  type RaydiumCpmmForwardConfigOptions,
} from "./config/raydium-cpmm";
export {
  raydiumClmmForwardConfig,
  RAYDIUM_CLMM_SWAP_V2_DISCRIMINATOR,
  type RaydiumClmmForwardConfigOptions,
} from "./config/raydium-clmm";
export {
  whirlpoolForwardConfig,
  WHIRLPOOL_SWAP_V2_DISCRIMINATOR,
  type WhirlpoolForwardConfigOptions,
} from "./config/whirlpool";
