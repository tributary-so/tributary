---
# tributary-2lbf
title: createSwapWhenBalanceLow in meteora-dlmm.ts
status: completed
type: task
priority: high
created_at: 2026-07-24T10:35:01Z
updated_at: 2026-07-24T12:03:17Z
parent: tributary-cxg8
blocked_by:
  - tributary-eznl
---

Add createSwapWhenBalanceLow() to packages/forward-builders/src/meteora-dlmm.ts. Composes meteoraDlmmForwardConfig + balanceCheck + composablePolicyRecipe + createMeteoraDlmmForward. Returns { create: { policyType, memo, recipient, forwardConfig, pre/post spec+init }, forwardBuilder }. Full create bundle — integrator provides only accounts + programId. Blocked-by SDK epic (tributary-eznl).

## Summary of Changes

Implemented `createSwapWhenBalanceLow` — the Meteora DLMM named recipe that composes all three tiers (tributary-69jm) into a single create bundle for the canonical "top up recipient when their output balance drops below a threshold" auto-swap policy.

- `packages/forward-builders/src/meteora-dlmm.ts`: added `createSwapWhenBalanceLow()` + `CreateSwapWhenBalanceLowOptions` + `SwapWhenBalanceLowCreateBundle`. Composes `meteoraDlmmForwardConfig` (tier-1 constraint) + `recipientOutputBalanceCheck` (tier-2 pre-validation, the "balance low" trigger) + `composablePolicyRecipe` (tier-3 enforcement) + `createMeteoraDlmmForward` (tier-1 fire builder). Returns `{ create: {policyType, memo, recipient, forwardConfig, pre/post spec+init}, forwardBuilder }`. Optional `post` override + `allowUnsafeActMode` escape hatch threaded through.
- `packages/forward-builders/src/index.ts`: exported the new function + types.
- `packages/forward-builders/src/meteora-dlmm.test.ts`: 6 new jest cases — bundle shape, pre-validation targets recipient output ATA, deliver-transform economic warning fires, pool pinned on-chain, `unwrapNativeSol`/`applyHostFeeInFix` threading, caller-supplied post override.
- `packages/forward-builders/jest.config.cjs`: added `moduleNameMapper` for `@tributary-so/sdk` → TS source. The SDK ships ESM-only; runtime imports (composablePolicyRecipe, recipientOutputBalanceCheck) needed a CJS-loadable resolution path for the jest node environment.

Verification: `npx jest` (23 passed, 2 suites), `tsc --noEmit` clean, `prettier --check` clean.
