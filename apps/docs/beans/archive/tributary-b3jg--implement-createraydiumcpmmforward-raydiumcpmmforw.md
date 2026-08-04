---
# tributary-b3jg
title: Implement createRaydiumCpmmForward + raydiumCpmmForwardConfig
status: completed
type: task
priority: high
created_at: 2026-07-22T11:42:04Z
updated_at: 2026-07-22T12:32:29Z
parent: tributary-evkj
blocked_by:
    - tributary-k4jr
---

New packages/forward-builders/src/raydium-cpmm.ts. Add RAYDIUM_CPMM_PUBKEY to constants.ts. Build swap_base_input instruction via @raydium-io/raydium-sdk-v2. Discriminator [143,190,90,218,196,30,51,222]. Pin pool_state (index 3) + amm_config (index 2). No host-fee fix needed. forwardAccounts strip isSigner (ADR-0008). Mirror meteora-dlmm.ts structure. Slippage: bps-floor default + minimumAmountOut override opt.


## Summary of Changes

- `packages/forward-builders/src/constants.ts`: Added `RAYDIUM_CPMM_PUBKEY` (`CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C`).
- `packages/forward-builders/src/raydium-cpmm.ts` (new): 
  - `createRaydiumCpmmForward(opts)` — fire-time builder using `makeSwapCpmmBaseInInstruction`. Zero RPC calls (all accounts are pure PDA/ATA derivations). Bps-floor default slippage + `minimumAmountOut` override. No host-fee fix (CPMM has none).
  - `raydiumCpmmForwardConfig(opts)` — setup-time `ForwardConfig` pinning `programId`, `dataChecks[0]` = swap_base_input discriminator, `pinnedAccounts[0]` = pool_state (idx 3), `pinnedAccounts[1]` = amm_config (idx 2).
  - `RAYDIUM_CPMM_SWAP_BASE_INPUT_DISCRIMINATOR` = `[143,190,90,218,196,30,51,222]` (verified: sha256("global:swap_base_input")[0:8]).

Verification: `tsc --noEmit` clean, `pnpm test` 10/10 existing pass, 3/3 raydium smoke tests pass (24-byte instructionData, 13 accounts, no isSigner leak, correct account pins, correct minOut floor). tsup build succeeds.
