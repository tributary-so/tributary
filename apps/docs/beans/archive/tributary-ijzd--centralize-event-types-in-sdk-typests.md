---
# tributary-ijzd
title: Centralize event types in SDK types.ts
status: completed
type: feature
priority: normal
created_at: 2026-07-16T10:22:56Z
updated_at: 2026-07-16T13:01:35Z
parent: tributary-29wo
---

Export all Anchor event types via IdlEvents<Tributary> in packages/sdk/src/types.ts. Single source of truth — no more hand-written event interfaces.

## Summary of Changes

Both child tasks completed:
- tributary-gd1l: All 19 IdlEvents types exported from types.ts
- tributary-7ape: Build/typecheck/tests verified — all pass
