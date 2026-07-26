---
# tributary-ezpd
title: 'lighthouseValidation bridge: LighthouseAssertion → { spec, init }'
status: completed
type: task
priority: high
created_at: 2026-07-24T10:34:51Z
updated_at: 2026-07-24T10:59:00Z
parent: tributary-eznl
---

Pure function. Wraps programCallSpec(LIGHTHOUSE_PUBKEY) + makeValidationInit(guard.accounts.map(a=>a.pubkey), guard.data). Also the escape hatch for custom assertions not yet recipe'd. In packages/sdk/src/.

## Summary of Changes

Implemented `lighthouseValidation` bridge in `packages/sdk/src/validation-recipes.ts` (new module).

- `lighthouseValidation(guard: LighthouseAssertion) → { spec, init }` — wraps `programCallSpec(LIGHTHOUSE_PROGRAM_ID)` + `makeValidationInit(guard.accounts.map(a=>a.pubkey), guard.data)`. Pure, no I/O. Doubles as the escape hatch for custom assertions not yet recipe'd.
- Exported shared infrastructure for sibling recipes:
  - `programCallSpec(programId): ValidationSpec` — generic `{ programCall: { programId } }` builder (balanceCheck + site variants delegate here).
  - `ValidationInit` type alias = `ReturnType<typeof makeValidationInit>` — the on-chain pinned-account + assertion-data struct.
- Exported `makeValidationInit` from `sdk.ts` (was private) so the recipe layer reuses the existing padding/indexing logic rather than duplicating it.
- Wired into `packages/sdk/src/index.ts`.

Tests: `packages/sdk/src/__tests__/lighthouse-validation-bridge.test.ts` — 5 cases (programCallSpec shape, spec→LIGHTHOUSE, init matches makeValidationInit output, multi-target indexing, zero-account escape hatch). Full SDK suite: 26/26 pass. `tsc --noEmit` clean. `pnpm run lint` clean.

Commit: see this commit's SHA.
