---
# tributary-a6ci
title: Unit tests for raydium-cpmm builder (mirror meteora-dlmm.test.ts)
status: todo
type: task
priority: normal
created_at: 2026-07-22T11:42:04Z
updated_at: 2026-07-22T11:42:33Z
parent: tributary-evkj
blocked_by:
    - tributary-b3jg
---

Mock @raydium-io/raydium-sdk-v2 swap construction. Assert: isWritable preserved per-account, isSigner never emitted, instructionData is raw swap data, discriminator pinned at offset 0, pool_state + amm_config pinned. Cover unwrapNativeSol flag (FORWARD_FLAG_NATIVE_OUTPUT).
