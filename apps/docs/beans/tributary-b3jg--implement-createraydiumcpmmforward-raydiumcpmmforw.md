---
# tributary-b3jg
title: Implement createRaydiumCpmmForward + raydiumCpmmForwardConfig
status: todo
type: task
priority: high
created_at: 2026-07-22T11:42:04Z
updated_at: 2026-07-22T11:42:33Z
parent: tributary-evkj
blocked_by:
    - tributary-k4jr
---

New packages/forward-builders/src/raydium-cpmm.ts. Add RAYDIUM_CPMM_PUBKEY to constants.ts. Build swap_base_input instruction via @raydium-io/raydium-sdk-v2. Discriminator [143,190,90,218,196,30,51,222]. Pin pool_state (index 3) + amm_config (index 2). No host-fee fix needed. forwardAccounts strip isSigner (ADR-0008). Mirror meteora-dlmm.ts structure. Slippage: bps-floor default + minimumAmountOut override opt.
