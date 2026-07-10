---
# tributary-gqcr
title: 'apps/app: verify account-page.tsx instructionConstraint reads'
status: todo
type: feature
priority: low
created_at: 2026-07-10T10:20:43Z
updated_at: 2026-07-10T20:08:44Z
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
- [ ] Verify the file compiles after IDL regeneration (the `forwardConfig` type will now carry `pinnedAccounts: PinnedAccount[]`)
- [ ] If the page renders any composable policy detail showing pinned accounts, update the rendering for `{index, pubkey}` format. Search for `pinnedAccounts` in the file — if no matches, nothing to do.
- [ ] `cd apps/app && pnpm run build` passes
- [ ] `cd apps/app && pnpm run lint` passes

## Likely outcome
This is a **verify-only** task. The app reads `programId` only, not `pinnedAccounts`. If the IDL type compiles, no code changes needed.
