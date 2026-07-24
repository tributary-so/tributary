---
# tributary-2lbf
title: createSwapWhenBalanceLow in meteora-dlmm.ts
status: todo
type: task
priority: high
created_at: 2026-07-24T10:35:01Z
updated_at: 2026-07-24T10:35:13Z
parent: tributary-cxg8
blocked_by:
    - tributary-eznl
---

Add createSwapWhenBalanceLow() to packages/forward-builders/src/meteora-dlmm.ts. Composes meteoraDlmmForwardConfig + balanceCheck + composablePolicyRecipe + createMeteoraDlmmForward. Returns { create: { policyType, memo, recipient, forwardConfig, pre/post spec+init }, forwardBuilder }. Full create bundle — integrator provides only accounts + programId. Blocked-by SDK epic (tributary-eznl).
