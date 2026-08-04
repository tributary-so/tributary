---
# tributary-ta3i
title: 'P0 Quickstart: auto-topup (Mill wedge)'
status: completed
type: task
priority: critical
created_at: 2026-07-13T11:12:23Z
updated_at: 2026-08-04T20:06:46Z
parent: tributary-9825
---

**File:** new — `apps/docs/docs/quickstarts/p0-auto-topup.md`

**From checklist §D:** P0 Quickstart: auto-topup (Mill wedge). Copy-paste: balance-threshold trigger + USDC→SOL forward swap.

**Requirements:**

- Uses PayAsYouGo or Subscription PolicyType
- Lighthouse pre-validation guard (balance check: hot wallet USDC < threshold)
- Forward CPI to swap USDC→SOL (Meteora DLMM)
- Deliver-transform settlement (output_mint != input_mint)
- The "Mill wedge" concept: a policy that keeps a wallet above a minimum balance by pulling USDC when low and swapping to SOL

**Current code anchors:** programs/tributary/src/constants.rs, packages/sdk/src/instructions/composable.ts, packages/sdk/src/lighthouse/

**Per ADR:** ADR-0021, ADR-0026

**Acceptance:** A developer can copy-paste this and have an auto-topup running. All SDK signatures correct. remainingAccounts correctly assembled.

## Summary of Changes

File existed with substantial content but had compile-breaking bugs. Fixed: missing imports (Transaction, sendAndConfirmTransaction, SystemProgram, TransactionInstruction), PublicKey.default()→PublicKey.default (static getter, no parens), pinnedAccounts: [] → 2-entry fixed-size array (Borsh [PinnedAccount; 2]), createComposable arg misalignment (11 args → 14 args with post-validation params inserted), paymentFrequency type (BN → { custom: BN } enum), subscription padding size (72→97 per IDL), auto-dca added post-validation price guard example.
