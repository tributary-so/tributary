---
# tributary-2cpz
title: Add memo to ComposableExecuted event + emit
status: todo
type: task
created_at: 2026-07-16T10:22:40Z
updated_at: 2026-07-16T10:22:40Z
parent: tributary-88p7
---

Add `pub memo: [u8; 32]` to `ComposableExecuted` in `programs/tributary/src/state/events.rs` (line ~170). Update emit! at `execute_composable.rs:1448` to pass `memo: composable_policy.memo`. Run `anchor build` to regen IDL.
