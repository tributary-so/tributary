---
# tributary-3pvf
title: Wire SDK lighthouse facade to pass pinned validation accounts at creation
status: todo
type: task
priority: high
created_at: 2026-06-27T14:43:59Z
updated_at: 2026-06-27T14:44:15Z
parent: tributary-pdj8
blocked_by:
    - tributary-ru3b
---

Wires the TypeScript SDK to the new on-chain ValidationPda contract from task A. The lighthouse facade (`packages/sdk/src/lighthouse.ts`) `build()` already returns `{ data, numAccounts, accounts }` — no facade logic change needed, just call-site wiring.

**Changes**:
- `packages/sdk/src`: drop `num_validation_accounts` from the `getCreateComposablePolicyInstruction` / `sdk.createComposablePolicy` signatures; instead pass the pinned account pubkeys (`accounts`) + arity (`numAccounts`) derived from the lighthouse assertion builder.
- `packages/sdk-react`: update any hooks that wrap policy creation.
- Update the exported types / IDL bindings once task A's new on-chain layout is compiled.

**Tests**: update TS tests (`tests/`, `packages/sdk/**tests**`) that call `createComposablePolicy` to supply the pinned set; assert the create ix carries the pubkeys through.

**Acceptance**: a caller building a Lighthouse assertion via the facade can create a composable policy whose ValidationPda carries the pinned target accounts end-to-end; no `num_validation_accounts` leak in the public SDK surface.

Blocked by task A (on-chain struct must accept the accounts first).
