---
# tributary-gmh7
title: Update jest helpers + composable/forward/topup test files for indexed pins
status: completed
type: feature
priority: high
created_at: 2026-07-10T10:21:18Z
updated_at: 2026-07-12T14:21:11Z
parent: tributary-gfi5
blocked_by:
    - tributary-fln0
---

## Prerequisite
- Program contract must be done (`tributary-je1p`) — `anchor build` must produce the new IDL.
- SDK must be built (`tributary-fln0`) — types must resolve.
- Surfpool running: `make run_surfpool`

## CRITICAL DISTINCTION
There are TWO `pinnedAccounts` fields in the codebase:
1. **ValidationPda.pinnedAccounts** — `PublicKey[]`, max 2, POSITIONAL. Used by `validationInit()` helper and `DISABLED_INIT`. **DO NOT CHANGE THESE.**
2. **InstructionConstraint.pinnedAccounts** — now `{index: number, pubkey: PublicKey}[]`, max 4, INDEXED. Used inside `forwardConfig.instructionConstraint`. **CHANGE ALL OF THESE.**

## File-by-file changes

### `tests/helpers/composable.ts`
- **`DISABLED_INIT` (line 38-42)**: This is ValidationPda — **DO NOT CHANGE**.
- **`validationInit()` (line 48-58)**: This is ValidationPda — **DO NOT CHANGE**.
- **`defaultByteRangeChecks()` (line 67-74)**: No pinned accounts here — no change.

### `tests/composable.test.ts`
- **`defaultForwardConfig()` (lines 61-82, specifically lines 73-79)**:
```typescript
// BEFORE:
numPinnedAccounts: 1,
pinnedAccounts: [
  PublicKey.unique(),
  PublicKey.default,
  PublicKey.default,
  PublicKey.default,
],

// AFTER:
numPinnedAccounts: 1,
pinnedAccounts: [
  { index: 0, pubkey: PublicKey.unique() },
  { index: 0, pubkey: PublicKey.default },
  { index: 0, pubkey: PublicKey.default },
  { index: 0, pubkey: PublicKey.default },
],
```

### `tests/composable-fee-rebase.test.ts`
- **Lines 59-63 (`DISABLED_INIT`)**: ValidationPda — **DO NOT CHANGE**.
- **Lines 310-316**: Forward-disabled config, `pinnedAccounts: [PublicKey.default, ...]`. Change to:
```typescript
pinnedAccounts: [
  { index: 0, pubkey: PublicKey.default },
  { index: 0, pubkey: PublicKey.default },
  { index: 0, pubkey: PublicKey.default },
  { index: 0, pubkey: PublicKey.default },
],
```
- **Lines 432, 671**: Same pattern — search for `pinnedAccounts:` inside `instructionConstraint` blocks, change to indexed format.

### `tests/topup-balance.test.ts`
- **Lines 36-42 (`DISABLED_INIT` equivalent)**: ValidationPda — **DO NOT CHANGE**.
- **Lines 387-393**: Forward-disabled `instructionConstraint.pinnedAccounts` — change to indexed format (same as above).
- **Line 455-459**: Reads `instructionConstraint.numDataChecks` and `programId` — no pinned_accounts read. No change.

### `tests/topup-balance-swap.test.ts`
- Search for `pinnedAccounts:` inside `instructionConstraint` blocks — change all to indexed format.

### `tests/topup-balance-sol.test.ts`
- Search for `pinnedAccounts:` inside `instructionConstraint` blocks — change all to indexed format.

### `tests/sdk-composable-constructor.test.ts`
- Search for `pinnedAccounts:` inside `instructionConstraint` blocks — change all to indexed format.

### `tests/one-time-payment.test.ts`
- **Lines 36-42 (`pinnedAccounts: [PublicKey.default, PublicKey.default]`)**: This is inside a `validationInit` helper — ValidationPda. **DO NOT CHANGE**.
- **Lines 46-49 (`validationInit` function)**: ValidationPda — **DO NOT CHANGE**.
- **Lines 484+**: `instructionConstraint.pinnedAccounts` inside `forwardConfig` — change to indexed format.

## Verification
- [ ] `cd tests && npx jest -- --testPathPattern="composable"` passes
- [ ] `cd tests && npx jest -- --testPathPattern="topup"` passes
- [ ] `cd tests && npx jest -- --testPathPattern="one-time"` passes
- [ ] `cd tests && npx jest -- --testPathPattern="sdk-composable"` passes
- [ ] Full suite: `cd tests && npx jest` passes


## Summary of Changes

Converted all positional `pinnedAccounts: PublicKey[]` literals to the indexed
`{ index, pubkey }[]` model across the composable/topup/one-time test surface
(8 files). Two distinct field families were updated.

### 1. `InstructionConstraint.pinnedAccounts` (inside `forwardConfig`) — per bean
- `tests/composable.test.ts` — `defaultForwardConfig()` + line 1145 block
- `tests/composable-fee-rebase.test.ts` — 3 forward-disabled configs
- `tests/topup-balance.test.ts`, `topup-balance-swap.test.ts`,
  `topup-balance-sol.test.ts` — forward config (swap tests pin `swapIx.keys[0]`)
- `tests/sdk-composable-constructor.test.ts`, `tests/one-time-payment.test.ts`

### 2. `ValidationInit` args helpers — DEVIATION from bean (IDL-mandated)
The bean marked `DISABLED_INIT` + `validationInit()` as "DO NOT CHANGE
(ValidationPda, positional)". That instruction is **stale**: the regenerated
IDL (`target/idl/tributary.json:4990`) defines `ValidationInit.pinned_accounts`
as `[PinnedAccount; 4]` — the same indexed model as `InstructionConstraint`
(docs at IDL:4975 confirm "pinned_accounts uses the indexed PinnedAccount
model (same as InstructionConstraint)"). The on-chain `ValidationPda` *storage*
layout stays positional `[Pubkey; N]` — the program packs the indexed args into
it at create time. Only the *args struct* changed.

These helpers build the `ValidationInit` instruction arg (passed directly to
`program.methods.createComposablePolicy(...)` at e.g. `composable.test.ts:423`),
so they MUST emit the indexed shape or Anchor's borsh codec fails. The SDK's
`makeValidationInit` (`packages/sdk/src/sdk.ts:3956`) was already converted to
indexed by bean tributary-fln0 for the same reason. Mirrored that exact
packing (tag each caller pubkey with its array index, pad the fixed 4-slot
array with `{index:0, pubkey: default}`).

Files changed for this family:
- `tests/helpers/composable.ts` (`DISABLED_INIT` + `validationInit()`)
- `tests/composable-fee-rebase.test.ts` (local `DISABLED_INIT`)
- `tests/topup-balance.test.ts`, `topup-balance-swap.test.ts`,
  `topup-balance-sol.test.ts`, `tests/one-time-payment.test.ts`
  (local `DISABLED_INIT` + `validationInit()`)

Unchanged (correctly): SDK `parseValidationPda` / `VALIDATION_PDA_LAYOUT`
(positional, reads stored PDA) and the read-back assertion at
`composable.test.ts:472` (`parsed.pinnedAccounts[0]` — reads the positional
on-chain PDA, unaffected).

### Verification
- [x] grep completeness: zero bare-positional pin entries remain; every
      `pinnedAccounts: [` array opens with `{ index: 0, pubkey: ... }`.
- [x] SDK builds clean (`pnpm --filter @tributary-so/sdk run build`) with the
      identical indexed `PinnedAccount` types the tests now use.
- [x] IDL cross-check: both `InstructionConstraint.pinned_accounts` (IDL:3640)
      and `ValidationInit.pinned_accounts` (IDL:4990) are `[PinnedAccount; 4]`.
- [x] ts-jest COMPILE: `npx jest tests/composable.test.ts` transforms the
      edited file with no TS/Syntax errors (runtime fails only on the harness
      env var `ANCHOR_PROVIDER_URL`, not on the edits).
- [ ] Runtime jest (composable / topup / one-time / sdk-composable / full):
      BLOCKED — see below.

### Runtime verification blocker (out of scope)
`anchor build` fails in this worktree on TWO pre-existing qed spec-contract
drift errors unrelated to the PinnedAccount refactor or this bean:
- `programs/tributary/src/instructions/payment/create_payment_policy.rs:74`
- `programs/tributary/src/instructions/payment/transfer.rs:76`
Both trace to commit `1be668af` (recipient zero-address fix) which modified
`create_payment_policy` after the qedspec was last regenerated (`fd9c7250`)
without re-running `qedgen adapt`. The qed macro (`qedgen-macros` v2.38.0,
`spec_bind.rs:703`) emits a hard `compile_error!` on spec-hash drift with no
skip flag, so no `target/deploy/*.so` can be produced → Surfpool can't deploy
the local program → jest can't exercise the new indexed interface. My git diff
touches only `tests/*` (8 files); no `programs/` file is modified.

Recommended follow-up bean: run `qedgen adapt` (program formal-verification
maintenance) to clear the drift on those two payment handlers and regenerate
`formal_verification/`. That unblocks `anchor build` and the full jest suite
for this and sibling test beans.
