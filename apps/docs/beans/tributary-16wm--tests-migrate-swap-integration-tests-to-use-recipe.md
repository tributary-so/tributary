---
# tributary-16wm
title: 'Tests: migrate swap integration tests to use recipes'
status: todo
type: feature
priority: normal
created_at: 2026-07-24T10:34:26Z
updated_at: 2026-07-24T17:48:33Z
parent: tributary-69jm
blocked_by:
    - tributary-2lbf
    - tributary-f2g5
---

Rewrite tests/topup-balance-swap-meteora.test.ts and tests/topup-balance-swap-raydium.test.ts to use createSwapWhenBalanceLow + buildComposableExecutionPayload. Collapses ~70 lines of boilerplate per test to ~15. Verify same assertions pass (balance changes, policy state, fee distribution, period cap rejection).
