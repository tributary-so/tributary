---
# tributary-68ay
title: 'apps/showcase-topup-sol: useCreateTopupPolicy hook'
status: completed
type: feature
priority: normal
created_at: 2026-07-10T10:19:57Z
updated_at: 2026-07-12T07:14:54Z
parent: tributary-u3gi
blocked_by:
    - tributary-fln0
---

## Prerequisite
SDK must be built with the new IDL first (`tributary-fln0` must be completed).

## File
`apps/showcase-topup-sol/src/hooks/useCreateTopupPolicy.ts`

## Change (lines 170-191)
The `forwardConfig.instructionConstraint` currently uses positional pins:

```typescript
// BEFORE (lines 180-186):
numPinnedAccounts: 1,
pinnedAccounts: [
  PublicKey.unique(),
  PublicKey.default,
  PublicKey.default,
  PublicKey.default,
],
```

Change to indexed format:
```typescript
// AFTER:
numPinnedAccounts: 1,
pinnedAccounts: [
  { index: 0, pubkey: PublicKey.unique() },  // pin the LbPair (first forward account)
  { index: 0, pubkey: PublicKey.default },
  { index: 0, pubkey: PublicKey.default },
  { index: 0, pubkey: PublicKey.default },
],
```

NOTE: `PublicKey.unique()` is a placeholder (same as CLI). The real showcase should pin the actual Meteora DLMM pool pubkey that the forward CPI targets. A follow-up should replace this with a real pool address from the showcase config.

## Verification
- [x] `tsc -b` passes (type-level build; full `pnpm run build` gated by missing `VITE_SOLANA_API` env var — pre-existing, unrelated to this change)
- [x] `pnpm run lint` passes (0 errors, 4 pre-existing warnings in unrelated files)

## Summary of Changes

Migrated `forwardConfig.instructionConstraint.pinnedAccounts` in `apps/showcase-topup-sol/src/hooks/useCreateTopupPolicy.ts` from the deprecated positional `PublicKey[]` shape to the new indexed `{ index, pubkey }[]` shape that the regenerated IDL (bean tributary-fln0) requires. All four slots carry `index: 0` (only the first is active via `numPinnedAccounts: 1`); the active pin remains a `PublicKey.unique()` placeholder marked with a `ponytail:` comment so a follow-up can swap in the real Meteora DLMM pool pubkey.

Verification:
- `npx tsc -b` → exit 0 (type change validates against the new IDL).
- `pnpm run lint` → 0 errors.
- Full `pnpm run build` (`tsc -b && vite build`) is blocked only by a missing `VITE_SOLANA_API` env var in this worktree — a pre-existing env gate, not a code/type defect.

Commits: see commit on this bean's lane.
