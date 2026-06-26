---
# tributary-owa8
title: 'M8: Replace any types in SDK composable methods with PolicyStatus/PolicyType/ForwardConfig'
status: completed
type: task
priority: normal
created_at: 2026-06-22T13:55:24Z
updated_at: 2026-06-22T14:03:33Z
---

Several public SDK methods in packages/sdk/src/sdk.ts accept  for typed parameters (changeComposablePolicyStatus, deleteComposablePolicy, getCreateComposablePolicyInstruction). The strict types already exist in types.ts (PolicyStatus, PolicyType, ForwardConfig, ComposablePolicy) — they're just not imported/used.

Fix:
- Replace  annotations with the proper types from ./types
- Use ComposablePolicy for fetch results where  is used
- Verify tsc compiles cleanly

Report: reports/M8-sdk-public-methods-use-any-types.md

## Summary of Changes

M8-scoped `any` replacements applied to `packages/sdk/src/sdk.ts` (composable methods only):

- Added `AccountMeta` to `@solana/web3.js` imports.
- `getCreateComposablePolicyInstruction`: `policyType: any` -> `PolicyType`, `forwardConfig: any` -> `ForwardConfig`.
- `executeComposable`: `remainingAccounts?: any[]` -> `AccountMeta[]`; `const policy: any` -> `ComposablePolicy`.
- `changeComposablePolicyStatus`: `newStatus: any` -> `PolicyStatus` (stale 'IDL not regenerated' comment removed).
- `deleteComposablePolicy`: `const policy: any` -> `ComposablePolicy`; `const remainingAccounts: any[]` -> `AccountMeta[]`.

Out-of-scope (left untouched):
- Lines 2027-2029 `(userPayment as any).createdComposableCount` — H6 finding, separate.
- Token-account RPC parsing casts (`tokenAccountInfo.value.data as any`) — unrelated Solana RPC shapes.
- Wallet/tx-signing helpers (`updateWallet`, `(tx as any).sign`) — pre-existing, unrelated.

Verification: `cd packages/sdk && npx tsc --noEmit` -> EXIT=0 (clean).

Files modified: 1 (`packages/sdk/src/sdk.ts`, +10/-11).
Artifacts untouched: `reports/`, `.beans/`, `target/` not modified by this change.
