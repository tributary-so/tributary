---
# tributary-68ay
title: 'apps/showcase-topup-sol: useCreateTopupPolicy hook'
status: todo
type: feature
priority: normal
created_at: 2026-07-10T10:19:57Z
updated_at: 2026-07-10T20:08:30Z
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
- [ ] `cd apps/showcase-topup-sol && pnpm run build` passes
- [ ] `cd apps/showcase-topup-sol && pnpm run lint` passes
