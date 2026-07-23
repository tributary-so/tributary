---
# tributary-rzbo
title: Jest tests for ore-topup builder
status: todo
type: task
assigned: tester
created_at: 2026-07-23T08:04:11Z
updated_at: 2026-07-23T08:04:11Z
parent: tributary-ljah
blocked_by:
    - tributary-k94z
---

packages/forward-builders/src/ore-topup.test.ts mirroring meteora-dlmm.test.ts: instructionData byte layout (disc + le64 face), account order + writability, config pins the right automation PDA and carries the offset-0 check, no isSigner field leaks into forwardAccounts. pnpm test green. See milestone tributary-ew9s HANDOFF §5 bullet 3.
