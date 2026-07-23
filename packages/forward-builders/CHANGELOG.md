# @tributary-so/forward-builders

## Unreleased

### BREAKING CHANGES

- **deps:** `@meteora-ag/dlmm` and `@raydium-io/raydium-sdk-v2` moved from
  `dependencies` to optional `peerDependencies`. Consumers must install the
  forward-program SDK they import (`pnpm add @meteora-ag/dlmm` and/or
  `@raydium-io/raydium-sdk-v2`). The tsup bundle now externalizes both.

### Features

- **raydium-cpmm:** New `createRaydiumCpmmForward` + `raydiumCpmmForwardConfig`
  for Raydium CPMM `swap_base_input` composable forward (program
  `CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C`). Zero-RPC account
  derivation, dual-pin (pool_state + amm_config), bps-floor slippage default.

## 1.0.0 (2026-07-22)
