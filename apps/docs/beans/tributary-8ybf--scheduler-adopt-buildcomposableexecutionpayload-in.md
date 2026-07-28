---
# tributary-8ybf
title: "Scheduler: adopt buildComposableExecutionPayload in fire()"
status: completed
type: feature
priority: normal
created_at: 2026-07-24T10:34:37Z
updated_at: 2026-07-24T10:35:13Z
parent: tributary-69jm
blocked_by:
  - tributary-eznl
---

Replace the copy-pasted forward-build + resolveValidationTargets + assemble block in apps/scheduler/src/composable.ts:445-533 with buildComposableExecutionPayload(). Scheduler keeps its isScheduleReady face derivation and tx transport (simulate, sign, send). Only the payload-construction block changes.

## Summary of Changes

Replaced the inline forward-build + `resolveValidationTargets` (pre/post) +
`assembleComposableRemainingAccounts` block in `apps/scheduler/src/composable.ts`
(`fire()`) with a single call to `buildComposableExecutionPayload()` from
`@tributary-so/sdk` (ADR-0030 orchestrator).

- The scheduler now constructs the `ForwardBuilder` (Meteora DLMM, pool from
  `pinnedAccounts[0]`) and passes it to the orchestrator; the orchestrator owns
  `.build()`, validation-target resolution, and ADR-0016 assembly.
- Removed now-unused imports: `resolveValidationTargets`,
  `assembleComposableRemainingAccounts`.
- Added import: `buildComposableExecutionPayload`.
- `isForwardEnabled`, `ValidationPdaAccount`, and the scheduler's
  `isScheduleReady` face derivation + tx transport (simulate/sign/send) are
  unchanged.

Verified: `tsc --noEmit` (0 errors in composable.ts; pre-existing logger.ts
errors untouched), `eslint` clean, `tsup` build clean.
