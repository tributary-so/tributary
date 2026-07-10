---
# tributary-gmh7
title: Update jest helpers + composable/forward/topup test files for indexed pins
status: todo
type: feature
priority: high
created_at: 2026-07-10T10:21:18Z
updated_at: 2026-07-10T20:09:09Z
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
