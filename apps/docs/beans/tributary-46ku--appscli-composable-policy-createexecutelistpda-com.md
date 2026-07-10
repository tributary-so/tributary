---
# tributary-46ku
title: 'apps/cli: composable-policy create/execute/list/pda commands'
status: todo
type: feature
priority: high
created_at: 2026-07-10T10:19:42Z
updated_at: 2026-07-10T20:08:17Z
parent: tributary-u3gi
blocked_by:
    - tributary-fln0
---

## Prerequisite
SDK must be built with the new IDL first (`tributary-fln0` must be completed).

## Files

### 1. `apps/cli/src/commands/composable-policy/create.ts`

**`disabledForward()` function (lines 88-106):**
Change the disabled-forward fixture from positional to indexed:
```typescript
// BEFORE (line 101):
pinnedAccounts: [PublicKey.default, PublicKey.default, PublicKey.default, PublicKey.default],

// AFTER (numPinnedAccounts: 0, so pinnedAccounts content is irrelevant — but the IDL type now expects PinnedAccount[]):
pinnedAccounts: [
  { index: 0, pubkey: PublicKey.default },
  { index: 0, pubkey: PublicKey.default },
  { index: 0, pubkey: PublicKey.default },
  { index: 0, pubkey: PublicKey.default },
],
```

**Forward-enabled branch (lines 235-251, specifically line 247):**
```typescript
// BEFORE (line 246-247):
numPinnedAccounts: 1,
pinnedAccounts: [PublicKey.unique(), PublicKey.default, PublicKey.default, PublicKey.default],

// AFTER — the pin is now indexed. The `PublicKey.unique()` was a placeholder for "some account to pin". In the indexed model, specify which forward-account position it pins:
numPinnedAccounts: 1,
pinnedAccounts: [
  { index: 0, pubkey: PublicKey.unique() },  // pin forward account[0]
  { index: 0, pubkey: PublicKey.default },
  { index: 0, pubkey: PublicKey.default },
  { index: 0, pubkey: PublicKey.default },
],
```
NOTE: The current CLI uses `PublicKey.unique()` as a dummy pin — it does not actually know which DLMM account to pin. This is a known limitation. A follow-up should add a `--pin-account` flag: `--pin-account 0:<pubkey>,3:<pubkey>`. For now, keep the dummy but in the new struct shape.

**Validation pinnedAccounts (line 208, 215, 265):**
These are `pinnedAccounts: PublicKey[]` for the ValidationPda (Lighthouse targets). **DO NOT CHANGE** — ValidationPda stays positional.

### 2. `apps/cli/src/commands/composable-policy/execute.ts` (lines 70-98)
Reads `parseValidationPda(...).pinnedAccounts` — these are ValidationPda accounts. **DO NOT CHANGE.**
Forward accounts (lines 100-103) are passed as raw `PublicKey[]` via `--forward-accounts` flag — no change needed (the execute instruction takes raw accounts, not pins).

### 3. `apps/cli/src/commands/composable-policy/list.ts` (line 84)
Reads `instructionConstraint.programId` only. No pinned_accounts display. **No change needed** unless you want to show pin details.

### 4. `apps/cli/src/commands/pda/validation-pda.ts` (lines 53, 67)
Reads `ValidationPda.pinnedAccounts` — positional, **DO NOT CHANGE**.

## Verification
- [ ] `cd apps/cli && pnpm run build` passes
- [ ] `cd apps/cli && pnpm run lint` passes
- [ ] `pnpm run manager -- composable-policy create --help` still works
