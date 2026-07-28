# [@tributary-so/forward-builders-v1.1.0](https://github.com/tributary-so/tributary/compare/@tributary-so/forward-builders-v1.0.1...@tributary-so/forward-builders-v1.1.0) (2026-07-28)


* ♻️ refactor(forward-builders): move forward SDKs to optional peerDependencies ([ae6a002](https://github.com/tributary-so/tributary/commit/ae6a0026a98b765b98ed6d193cd729bc475c2d4a))


### Features

* **composable:** add forward_program named account + CLMM swap via v0 ALT ([25a165b](https://github.com/tributary-so/tributary/commit/25a165bb78d7f5bf961b020024963409c6084ea6))


### BREAKING CHANGES

* for existing consumers: @meteora-ag/dlmm is no longer
bundled; must be installed separately.

Refs: tributary-k4jr

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
