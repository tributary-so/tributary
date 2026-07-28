---
# tributary-54ob
title: 'buildComposableExecutionPayload: fire helper (ADR-0030 orchestrator)'
status: completed
type: task
priority: high
created_at: 2026-07-24T10:34:51Z
updated_at: 2026-07-24T10:53:07Z
parent: tributary-eznl
---

Async. buildComposableExecutionPayload({ connection, policy, composablePolicyPda, programId, forwardBuilder?, face }) → { instructionData, remainingAccounts }. Straight-line composition: isForwardEnabled check → forwardBuilder.build() → resolveValidationTargets(pre) + resolveValidationTargets(post) → assembleComposableRemainingAccounts. Does NOT derive face (caller-resolved). Does NOT include scheduler ATA (SDK executeComposable facade handles that). Primitives stay alongside for CLI override path. In packages/sdk/src/.

## Summary of Changes

Implemented `buildComposableExecutionPayload` in `packages/sdk/src/composable.ts` as a straight-line composition of the four ADR-0030 primitives (`isForwardEnabled` → `ForwardBuilder.build` → `resolveValidationTargets` pre/post → `assembleComposableRemainingAccounts`).

- Signature: `buildComposableExecutionPayload({ connection, policy, composablePolicyPda, programId, forwardBuilder?, face }) → { instructionData, remainingAccounts }`.
- Forward enabled + no builder → throws (orchestrator cannot synthesize a forward ix). Forward disabled → empty `instructionData` + empty forward slice; any supplied builder is ignored.
- Pre/post validation targets resolved in parallel; ADR-0016 order `[...pre, forward, ...post]` with `isSigner: false` on every entry (ADR-0008).
- Does NOT derive `face` (caller-resolved) and does NOT append the scheduler ATA (SDK `executeComposable` facade owns that). Primitives stay exported alongside for the CLI override path.
- Updated the module header comment: ADR-0030 §1 'no orchestrator' stance amended now that a third caller (tests + external integrators) materialized.

Tests: `packages/sdk/src/__tests__/build-composable-execution-payload.test.ts` (4 cases, all green — forward-disabled/ignored-builder, forward-enabled happy path, forward-enabled-no-builder throw, ProgramCall pre+post routing). Full SDK suite: 21/21 pass. `tsc --noEmit` clean. `pnpm run lint` clean.

Commit: see this commit's SHA.
