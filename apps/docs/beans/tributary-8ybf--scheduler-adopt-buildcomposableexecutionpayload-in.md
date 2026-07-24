---
# tributary-8ybf
title: 'Scheduler: adopt buildComposableExecutionPayload in fire()'
status: todo
type: feature
priority: normal
created_at: 2026-07-24T10:34:37Z
updated_at: 2026-07-24T10:35:13Z
parent: tributary-69jm
blocked_by:
    - tributary-eznl
---

Replace the copy-pasted forward-build + resolveValidationTargets + assemble block in apps/scheduler/src/composable.ts:445-533 with buildComposableExecutionPayload(). Scheduler keeps its isScheduleReady face derivation and tx transport (simulate, sign, send). Only the payload-construction block changes.
