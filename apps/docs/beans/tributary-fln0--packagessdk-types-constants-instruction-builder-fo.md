---
# tributary-fln0
title: 'packages/sdk: types + constants + instruction builder for indexed pins'
status: todo
type: feature
priority: high
created_at: 2026-07-10T10:19:11Z
updated_at: 2026-07-10T20:07:52Z
parent: tributary-u3gi
blocked_by:
    - tributary-je1p
---

## Prerequisite
Run `anchor build` first — the IDL must be regenerated with the new `PinnedAccount` struct before the TypeScript types will resolve. Copy the new IDL: `cp target/idl/tributary.json packages/sdk/idl/`.

## Files

### 1. `packages/sdk/src/constants.ts` (line 66-69)
```typescript
// BEFORE:
export const MAX_PINNED_FORWARD_ACCOUNTS = 4;

// AFTER: unchanged value, update comment
export const MAX_PINNED_FORWARD_ACCOUNTS = 4; // now indexed pins, not positional
```

### 2. `packages/sdk/src/types.ts` (lines 131-140)
The `InstructionConstraint` type resolves from IDL:
```typescript
export type InstructionConstraint = IdlTypes<Tributary>["instructionConstraint"];
```
After IDL regen, this will automatically include `pinnedAccounts: PinnedAccount[]` where `PinnedAccount = { index: number; pubkey: PublicKey }`. **No manual change needed** — but verify the resolved type compiles.

`ValidationPdaAccount` / `parseValidationPda` / `VALIDATION_PDA_LAYOUT` (lines 166-224): **DO NOT TOUCH**. These are for the Lighthouse ValidationPda, which stays positional. Verify they are not broken by the IDL change.

### 3. `packages/sdk/src/sdk.ts` — `makeValidationInit` (lines 3956-3972)
This helper packs **ValidationPda** pinned accounts (positional, max 2). **DO NOT CHANGE** — it is unrelated to the forward-CPI indexed pins.

### 4. `packages/sdk/src/sdk.ts` — `getCreateComposablePolicyInstruction` (lines 2661-2747)
The `forwardConfig` parameter already carries the `InstructionConstraint` as a typed object. After IDL regen, `forwardConfig.instructionConstraint.pinnedAccounts` will be `PinnedAccount[]` instead of `PublicKey[]`.

The caller must now pass indexed pins. The SDK does NOT construct `pinnedAccounts` itself — it passes `forwardConfig` through to `.createComposablePolicy(...)`. The caller (CLI, showcase, tests) constructs the `ForwardConfig` object.

**Action:** Verify the method signature compiles with the new IDL type. The `prePinnedAccounts` and `postPinnedAccounts` params (lines 2669, 2672) are for ValidationPda — **DO NOT CHANGE**.

### 5. `packages/sdk/src/sdk.ts` — `createComposable` high-level constructor (search for `createComposable`)
If this method builds a `ForwardConfig` internally with `pinnedAccounts: [PublicKey.default, ...]`, update to `pinnedAccounts: [{index: 0, pubkey: PublicKey.default}, ...]` or `pinnedAccounts: []` + `numPinnedAccounts: 0`.

## Verification
- [ ] `pnpm --filter @tributary-so/sdk run build` passes
- [ ] `pnpm --filter @tributary-so/sdk run lint` passes
- [ ] `pnpm --filter @tributary-so/sdk test` passes (if any unit tests reference InstructionConstraint)
