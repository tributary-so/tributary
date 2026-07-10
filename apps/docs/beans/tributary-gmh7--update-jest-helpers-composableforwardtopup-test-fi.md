---
# tributary-gmh7
title: Update jest helpers + composable/forward/topup test files for indexed pins
status: todo
type: feature
priority: high
created_at: 2026-07-10T10:21:18Z
updated_at: 2026-07-10T10:21:26Z
parent: tributary-gfi5
blocked_by:
    - tributary-fln0
---

## Files
- `tests/helpers/composable.ts`
- `tests/composable.test.ts`
- `tests/composable-fee-rebase.test.ts`
- `tests/topup-balance.test.ts`
- `tests/topup-balance-swap.test.ts`
- `tests/topup-balance-sol.test.ts`
- `tests/sdk-composable-constructor.test.ts`
- `tests/one-time-payment.test.ts`

## Changes
- [ ] `helpers/composable.ts`: Update any helper that builds instructionConstraint.pinnedAccounts to use indexed format
- [ ] Each test file constructs `instructionConstraint.pinnedAccounts` as flat `[PublicKey, ...]` — change to `[{index, pubkey}, ...]`
- [ ] For forward-disabled policies (pinnedAccounts all default): use `[]` (empty) or `[{index:0, pubkey: PublicKey.default}]` — verify the degenerate-pin guard still accepts when forward is disabled
- [ ] For forward-enabled policies: update the pinned accounts to indexed tuples matching the DLMM swap instruction grammar
- [ ] Note: `validationInit()` helper builds ValidationPda pinnedAccounts — these stay positional (PublicKey[]). Do NOT change validation pins.
- [ ] `cd tests && npx jest` passes (requires Surfpool)
