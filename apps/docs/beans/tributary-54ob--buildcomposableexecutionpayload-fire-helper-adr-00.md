---
# tributary-54ob
title: 'buildComposableExecutionPayload: fire helper (ADR-0030 orchestrator)'
status: todo
type: task
priority: high
created_at: 2026-07-24T10:34:51Z
updated_at: 2026-07-24T10:34:51Z
parent: tributary-eznl
---

Async. buildComposableExecutionPayload({ connection, policy, composablePolicyPda, programId, forwardBuilder?, face }) → { instructionData, remainingAccounts }. Straight-line composition: isForwardEnabled check → forwardBuilder.build() → resolveValidationTargets(pre) + resolveValidationTargets(post) → assembleComposableRemainingAccounts. Does NOT derive face (caller-resolved). Does NOT include scheduler ATA (SDK executeComposable facade handles that). Primitives stay alongside for CLI override path. In packages/sdk/src/.
