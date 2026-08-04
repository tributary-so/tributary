---
# tributary-h06c
title: Unit tests for all SDK recipe functions
status: completed
type: task
priority: normal
created_at: 2026-07-24T10:34:52Z
updated_at: 2026-07-24T11:12:21Z
parent: tributary-eznl
---

Unit tests in packages/sdk/src/__tests__/. Test lighthouseValidation bridge (spec/init shape), balanceCheck + site variants (correct ATA derivation, correct lighthouse assertion), composablePolicyRecipe enforcement (throw on act-mode-no-post, warn cases, allowUnsafeActMode escape), buildComposableExecutionPayload (mock connection, verify remaining_accounts order). Pure-function tests — no RPC, no surfpool.

## Summary of Changes

Unit tests for all SDK recipe functions live in `packages/sdk/src/__tests__/`. Coverage by bean requirement:

1. **lighthouseValidation bridge** (spec/init shape) — `lighthouse-validation-bridge.test.ts` (5 cases): programCallSpec shape, spec→LIGHTHOUSE, init matches makeValidationInit output, multi-target indexing, zero-account escape hatch.

2. **balanceCheck + site variants** (correct ATA derivation, correct lighthouse assertion) — `balance-check-recipes.test.ts` (6 cases): balanceCheck spec/init/pinnedAccount, intermediate output/input ATA derivation (PDA owner, allowOwnerOffCurve), recipient ATA derivation, delegation cross-check vs direct balanceCheck.

3. **composablePolicyRecipe enforcement** (throw/warn/escape) — `composable-policy-recipe.test.ts` (10 cases): act-mode throw, allowUnsafeActMode override, deliver-transform warn, deliver-no-transform silent (×2: disabled + same-mint), no-pre warn, pre-provided, default fill, pass-through, forwardConfig passthrough.

4. **buildComposableExecutionPayload** (mock connection, remaining_accounts order) — `build-composable-execution-payload.test.ts` (4 cases): forward-disabled empty payload, forward-enabled happy path with ADR-0016 order, no-builder throw, ProgramCall pre+post routing.

5. **Cross-cutting composition** (tier-2 → tier-3) — `recipe-composition.test.ts` (4 cases): balanceCheck→recipe pre slot, intermediateOutput→recipe post slot, lighthouseValidation escape-hatch→act-mode recipe, structural type compatibility across all recipe families.

Total: 29 new test cases across 5 new test files. Full SDK suite: **46/46 pass**. `tsc --noEmit` clean. `pnpm run lint` clean. All pure-function tests — no RPC, no surfpool.

Commit: see this commit's SHA.
