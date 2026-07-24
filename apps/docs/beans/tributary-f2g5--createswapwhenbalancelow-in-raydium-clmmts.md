---
# tributary-f2g5
title: createSwapWhenBalanceLow in raydium-clmm.ts
status: completed
type: task
priority: normal
created_at: 2026-07-24T10:35:01Z
updated_at: 2026-07-24T12:12:27Z
parent: tributary-cxg8
blocked_by:
  - tributary-eznl
---

Same pattern as meteora-dlmm, wrapping raydiumClmmForwardConfig + createRaydiumClmmForward. Blocked-by SDK epic (tributary-eznl).

## Summary of Changes

Implemented `createSwapWhenBalanceLow` (CLMM variant) — the Raydium CLMM named recipe that composes all three tiers (tributary-69jm) into a single create bundle for the canonical "top up recipient when their output balance drops below a threshold" auto-swap policy.

- `packages/forward-builders/src/raydium-clmm.ts`: added `createSwapWhenBalanceLow()` + `CreateClmmSwapWhenBalanceLowOptions` + `ClmmSwapWhenBalanceLowCreateBundle`. Composes `raydiumClmmForwardConfig` (tier-1 constraint, pins pool + ammConfig) + `recipientOutputBalanceCheck` (tier-2 pre-validation, the "balance low" trigger) + `composablePolicyRecipe` (tier-3 enforcement) + `createRaydiumClmmForward` (tier-1 fire builder). Returns `{ create, forwardBuilder }`. Optional `post` override + `allowUnsafeActMode` escape hatch. No `applyHostFeeInFix` (CLMM has no host-fee quirk).
- `packages/forward-builders/src/index.ts`: exported as `createRaydiumClmmSwapWhenBalanceLow` + the new types (aliased to avoid clashing with the DLMM/CMM same-named recipes).
- `packages/forward-builders/src/raydium-clmm.test.ts` (new): 8 jest cases covering the pure `create` bundle (forwardConfig pins, pre-validation recipient ATA, deliver-transform warning, post override, unwrapNativeSol). Fire-time `build()` is RPC-heavy and left unexercised.

Verification: `npx jest` (31 passed, 3 suites), `tsc --noEmit` clean, `prettier --check` clean.
