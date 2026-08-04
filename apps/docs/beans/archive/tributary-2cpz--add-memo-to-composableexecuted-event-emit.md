---
# tributary-2cpz
title: Add memo to ComposableExecuted event + emit
status: completed
type: task
created_at: 2026-07-16T10:22:40Z
updated_at: 2026-07-16T10:22:40Z
parent: tributary-88p7
---

Add `pub memo: [u8; 32]` to `ComposableExecuted` in `programs/tributary/src/state/events.rs` (line ~170). Update emit! at `execute_composable.rs:1448` to pass `memo: composable_policy.memo`. Run `anchor build` to regen IDL.

## Summary of Changes

- `programs/tributary/src/state/events.rs`: added `pub memo: [u8; 32]` field to `ComposableExecuted` event struct (trailing position after `record_id`).
- `programs/tributary/src/instructions/composable/execute_composable.rs`: updated `emit!` at L1448 to pass `memo: composable_policy.memo` (matches the existing `[u8; 32]` field on `ComposablePolicy` at `state/composable_policy.rs:240`).
- `target/idl/tributary.json` + `target/types/tributary.ts`: regenerated via `anchor build`. IDL `ComposableExecuted` type now lists `memo: [u8; 32]` as the final field; event discriminator unchanged (existing on-chain/indexer consumers unaffected — additive field).
- Verified build succeeds (`anchor build` green); downstream consumers (SDK type export — sibling beans tributary-83xl / tributary-gd1l, verification tributary-3uac) will pick up the new field from the regen'd IDL.
