---
# tributary-l99n
title: 'T-1: Replace instructions: any[] with TransactionInstruction[]'
status: todo
type: task
priority: normal
created_at: 2026-07-06T15:42:02Z
updated_at: 2026-07-06T15:42:02Z
parent: tributary-jnx8
---

sdk-react/src/types.ts:37,55,79,117,147 — every Create*Result type uses any[]. Use TransactionInstruction[] for type safety.
