---
# tributary-gqcr
title: 'apps/app: verify account-page.tsx instructionConstraint reads'
status: completed
type: feature
priority: low
created_at: 2026-07-10T10:20:43Z
updated_at: 2026-07-12T07:31:29Z
parent: tributary-u3gi
blocked_by:
    - tributary-fln0
---

## Prerequisite
SDK must be built with the new IDL first (`tributary-fln0` must be completed).

## File
`apps/app/src/components/account/account-page.tsx`

## Current code
- **Line 602**: `const forwardProgram = policy.account.forwardConfig?.instructionConstraint?.programId`
- **Lines 1388-1389**: `const fc = policy.account.forwardConfig` / `const forwardProgram = fc?.instructionConstraint?.programId`

These read `programId` only — they do NOT access `pinnedAccounts`. After the IDL regenerates, these lines should compile unchanged.

## Action
- [x] Verify the file compiles after IDL regeneration (the `forwardConfig` type will now carry `pinnedAccounts: PinnedAccount[]`)
- [x] If the page renders any composable policy detail showing pinned accounts, update the rendering for `{index, pubkey}` format. Search for `pinnedAccounts` in the file — if no matches, nothing to do. (grep: 0 matches)
- [x] `cd apps/app && pnpm run build` passes (tsc -b + vite build OK; required building `packages/tokens-client` first — pre-existing unbuilt workspace dep, unrelated to this bean)
- [x] `cd apps/app && pnpm run lint` passes (0 errors; 3 pre-existing react-refresh warnings in cluster-data-access.tsx, unrelated)

## Likely outcome
This is a **verify-only** task. The app reads `programId` only, not `pinnedAccounts`. If the IDL type compiles, no code changes needed.

## Summary of Changes

Verify-only task — **no code changes** to `apps/app/src/components/account/account-page.tsx`.

- Confirmed the file reads only `forwardConfig.instructionConstraint.programId` (lines 612, 1560) — never `pinnedAccounts`. grep for `pinnedAccounts` in the file: 0 matches.
- `tsc -b` passes with the regenerated IDL (`InstructionConstraint` now resolves to the indexed `PinnedAccount { index, pubkey }[]` model). The `programId` reads are unaffected by the type change.
- `vite build` passes (env stubbed for the config loader).
- `eslint` passes (0 errors).

### Side note
- Had to build `packages/tokens-client` (`pnpm --filter @tributary-so/tokens-client run build`) to unblock the app build — it was an unbuilt workspace dependency. `dist/` is gitignored, so this leaves no working-tree trace. Pre-existing infra gap, not part of this bean's scope.
