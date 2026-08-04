---
# tributary-xigi
title: createSwapWhenBalanceLow in raydium-cpmm.ts
status: completed
type: task
priority: normal
created_at: 2026-07-24T10:35:01Z
updated_at: 2026-07-24T12:16:05Z
parent: tributary-cxg8
blocked_by:
  - tributary-eznl
---

Same pattern, wrapping raydiumCpmmForwardConfig + createRaydiumCpmmForward. Blocked-by SDK epic (tributary-eznl).

## Summary of Changes

Implemented `createSwapWhenBalanceLow` (CPMM variant) — the Raydium CPMM named recipe that composes all three tiers (tributary-69jm) into a single create bundle for the canonical "top up recipient when their output balance drops below a threshold" auto-swap policy.

- `packages/forward-builders/src/raydium-cpmm.ts`: added `createSwapWhenBalanceLow()` + `CreateCpmmSwapWhenBalanceLowOptions` + `CpmmSwapWhenBalanceLowCreateBundle`. Composes `raydiumCpmmForwardConfig` (tier-1 constraint, pins pool_state at idx 3 + amm_config at idx 2) + `recipientOutputBalanceCheck` (tier-2 pre-validation, the "balance low" trigger) + `composablePolicyRecipe` (tier-3 enforcement) + `createRaydiumCpmmForward` (tier-1 fire builder). Returns `{ create, forwardBuilder }`. Threads `minimumAmountOut` through to the fire builder. Optional `post` override + `allowUnsafeActMode` escape hatch.
- `packages/forward-builders/src/index.ts`: exported as `createRaydiumCpmmSwapWhenBalanceLow` + the new types (aliased to avoid clashing with the DLMM/CLMM same-named recipes).
- `packages/forward-builders/src/raydium-cpmm.test.ts`: 6 new jest cases (bundle shape, recipient ATA pre-validation, deliver-transform warning, pool+ammConfig pinning, unwrapNativeSol, post override).

Verification: `npx jest` (37 passed, 3 suites), `tsc --noEmit` clean, `prettier --check` clean.

This completes the parent feature tributary-cxg8 (all three forward programs: meteora-dlmm, raydium-clmm, raydium-cpmm now ship `createSwapWhenBalanceLow`).
