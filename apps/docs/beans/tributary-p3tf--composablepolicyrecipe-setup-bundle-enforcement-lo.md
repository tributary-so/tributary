---
# tributary-p3tf
title: 'composablePolicyRecipe: setup bundle + enforcement logic'
status: completed
type: task
priority: high
created_at: 2026-07-24T10:34:51Z
updated_at: 2026-07-24T11:05:23Z
parent: tributary-eznl
---

composablePolicyRecipe({ forwardConfig, pre?, post?, allowUnsafeActMode? }) → { forwardConfig, preValidation, preValidationInit, postValidation, postValidationInit }. Determines settlement shape from forwardConfig (deliver-no-transform / deliver-transform / act mode). Enforcement: throw if act mode + no post (unless allowUnsafeActMode), warn if deliver-transform + no post, warn if no pre. Fills disabled spec/init for missing pre/post. In packages/sdk/src/.

## Summary of Changes

Implemented `composablePolicyRecipe` in `packages/sdk/src/composable-recipes.ts` (new module, tier 3).

- Signature: `composablePolicyRecipe({ forwardConfig, pre?, post?, allowUnsafeActMode? }) → { forwardConfig, preValidation, preValidationInit, postValidation, postValidationInit }`.
- Determines settlement shape from forwardConfig: act mode (sentinel outputMint + forward enabled), deliver-transform (outputMint != inputMint + forward enabled), deliver-no-transform (forward disabled or same-mint).
- Enforcement posture:
  - **throw**: act mode + no post-validation (unless allowUnsafeActMode: true)
  - **warn**: deliver-transform + no post (redundant — program guards >0)
  - **warn**: any forward + no pre (economic, not security)
  - **silent**: deliver-no-transform + no post
- Fills missing pre/post with disabled spec (`{ disabled: {} }`) + empty init (`makeValidationInit([], Buffer.alloc(0))`).
- `pre`/`post` inputs accept any `{ spec: ValidationSpec, init: ValidationInit }` — from `lighthouseValidation`, `balanceCheck` (sibling tributary-r6kz), or hand-built.
- Exported from `packages/sdk/src/index.ts`.

Tests: `packages/sdk/src/__tests__/composable-policy-recipe.test.ts` — 10 cases (act-mode throw, allowUnsafeActMode override, deliver-transform warn, deliver-no-transform silent ×2, no-pre warn, pre-provided, default fill, pass-through, forwardConfig passthrough). Full SDK suite: 36/36 pass. `tsc --noEmit` clean. `pnpm run lint` clean.

Commit: see this commit's SHA.
