---
# tributary-3uac
title: Verify ComposableExecuted event includes memo
status: todo
type: task
created_at: 2026-07-16T10:22:40Z
updated_at: 2026-07-16T10:22:40Z
parent: tributary-88p7
blocked_by:
    - tributary-2cpz
---

Run existing composable tests (`tests/topup-balance.test.ts`, `tests/topup-balance-swap.test.ts`) and confirm ComposableExecuted events now carry the memo field. Check the IDL at `target/idl/tributary.json` includes memo in the event definition.
