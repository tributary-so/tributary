---
# tributary-a6ci
title: Unit tests for raydium-cpmm builder (mirror meteora-dlmm.test.ts)
status: completed
type: task
priority: normal
created_at: 2026-07-22T11:42:04Z
updated_at: 2026-07-22T12:36:04Z
parent: tributary-evkj
blocked_by:
    - tributary-b3jg
---

Mock @raydium-io/raydium-sdk-v2 swap construction. Assert: isWritable preserved per-account, isSigner never emitted, instructionData is raw swap data, discriminator pinned at offset 0, pool_state + amm_config pinned. Cover unwrapNativeSol flag (FORWARD_FLAG_NATIVE_OUTPUT).


## Summary of Changes

- `packages/forward-builders/src/raydium-cpmm.test.ts` (new): 7 unit tests mirroring meteora-dlmm.test.ts structure.
  - `createRaydiumCpmmForward`: returns ForwardBuilder, instructionData passthrough, isWritable preserved (NOT all-true), isSigner never emitted.
  - `raydiumCpmmForwardConfig`: pins programId + pool_state(idx3) + amm_config(idx2) + discriminator at dataChecks[0], unwrapNativeSol flag.
  - Mocks `@raydium-io/raydium-sdk-v2` (makeSwapCpmmBaseInInstruction + PDA helpers) — no RPC needed.

Verification: `pnpm test` 17/17 pass (10 meteora + 7 raydium), `tsc --noEmit` clean.
