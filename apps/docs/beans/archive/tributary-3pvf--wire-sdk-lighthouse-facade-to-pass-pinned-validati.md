---
# tributary-3pvf
title: Wire SDK lighthouse facade to pass pinned validation accounts at creation
status: completed
type: task
priority: high
created_at: 2026-06-27T14:43:59Z
updated_at: 2026-06-29T16:03:59Z
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

## Summary of Changes (Task B)

- `packages/sdk/src/sdk.ts`: getCreateComposablePolicyInstruction signature — dropped numValidationAccounts, added pinnedAccounts: PublicKey[] (arity derived, max 2). Normalises to the fixed-size [Pubkey; 2] the on-chain ix expects.
- `packages/sdk/src/sdk.ts`: executeComposable — validationPda now passed as a named account (was previously prepended to remaining_accounts). remaining_accounts collapses to [...lighthouseTargets, ...forwardAccounts, (scheduler_ata?)] per ADR-0016.
- `packages/sdk/src/constants.ts`: exported MAX_PINNED_VALIDATION_ACCOUNTS = 2.
- `packages/sdk/src/types.ts`: restored ValidationPdaAccount interface + parseValidationPda helper for the new on-chain layout (8+1+1+64+2+1024). Added parseValidationPdaData convenience (scheduler pre-filter keeps its one-call shape).
- `apps/scheduler/src/composable.ts`: updated to parseValidationPdaData. No remaining_accounts change needed — the scheduler already assembled [targets, ...forward] (the SDK was the one prepending ValidationPda; now nobody does).
- Tests (composable.test.ts, topup-balance*.test.ts): updated all createComposablePolicy call sites for the new signature (pinnedAccounts derived from the lighthouse facade's accounts); execute call sites now pass validationPda as a named account and drop it from remaining_accounts.

SDK builds clean. Test typecheck: 12 errors → 9 (the 3 I introduced are fixed; remaining 9 are pre-existing tsconfig noise: esModuleInterop / resolveJsonModule, unrelated to this change).
