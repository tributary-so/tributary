---
# tributary-7ape
title: Verify event types resolve after IDL regen
status: completed
type: task
priority: normal
created_at: 2026-07-16T10:22:56Z
updated_at: 2026-07-16T13:01:04Z
parent: tributary-ijzd
blocked_by:
    - tributary-gd1l
---

Run `cd packages/sdk && pnpm run build`. Confirm no type errors. Spot-check that ComposableExecutedEvent includes the new memo field. Run existing SDK tests.

## Summary of Changes

Verification of event type exports (tributary-gd1l):

- **Build**: `pnpm --filter @tributary-so/sdk run build` — success
- **Typecheck**: `tsc --noEmit` — clean (all 19 event types resolve)
- **SDK tests**: 13/13 pass
- **Downstream**: `@tributary-so/payments` 265/265 pass

**ComposableExecutedEvent memo field**: The `memo: [u8; 32]` field is NOT yet
in the IDL — it requires a program-level change to `events.rs` + `emit!`
(separate milestone task). Once that lands and the IDL is regenerated,
`ComposableExecutedEvent` will automatically pick up the `memo` field
through `IdlEvents<Tributary>["composableExecuted"]`. No SDK change needed.
