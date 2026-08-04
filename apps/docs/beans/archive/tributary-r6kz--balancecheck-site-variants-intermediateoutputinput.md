---
# tributary-r6kz
title: balanceCheck + site variants (intermediateOutput/Input, recipientOutput)
status: completed
type: task
priority: high
created_at: 2026-07-24T10:34:51Z
updated_at: 2026-07-24T11:09:19Z
parent: tributary-eznl
---

balanceCheck({ target, threshold, op }) wraps lighthouse.tokenAccount(target).amount(threshold, op).build() → lighthouseValidation. Site variants derive ATA via getAssociatedTokenAddressSync (pure sync) then delegate to balanceCheck: intermediateOutputBalanceCheck({ composablePolicyPda, outputMint }), intermediateInputBalanceCheck({ composablePolicyPda, inputMint }), recipientOutputBalanceCheck({ recipient, outputMint }). All in packages/sdk/src/.

## Summary of Changes

Implemented `balanceCheck` + 3 site variants in `packages/sdk/src/validation-recipes.ts` (extended tier-2 module).

- `balanceCheck({ target, threshold, op })` — wraps `lighthouse.tokenAccount(target).amount(threshold, op).build()` → `lighthouseValidation`. Generic SPL token-account amount assertion.
- `intermediateOutputBalanceCheck({ composablePolicyPda, outputMint, threshold, op })` — derives ATA via `getAssociatedTokenAddressSync(outputMint, composablePolicyPda, true)` (allowOwnerOffCurve — PDA owner), delegates to `balanceCheck`.
- `intermediateInputBalanceCheck({ composablePolicyPda, inputMint, threshold, op })` — same pattern with inputMint.
- `recipientOutputBalanceCheck({ recipient, outputMint, threshold, op })` — derives standard ATA `getAssociatedTokenAddressSync(outputMint, recipient)` (no allowOwnerOffCurve), delegates to `balanceCheck`.

All four are pure sync functions returning `{ spec: ValidationSpec, init: ValidationInit }`. Updated module header to reflect day-one scope (was placeholder for sibling recipes).

Tests: `packages/sdk/src/__tests__/balance-check-recipes.test.ts` — 6 cases (balanceCheck spec/init/pinnedAccount, intermediate output/input ATA derivation, recipient ATA derivation + delegation cross-check). Full SDK suite: 42/42 pass. `tsc --noEmit` clean. `pnpm run lint` clean.

Commit: see this commit's SHA.
