---
# tributary-2net
title: 'Fix example: native-sol-topup.md'
status: completed
type: task
priority: critical
created_at: 2026-07-13T11:11:02Z
updated_at: 2026-07-13T12:00:53Z
parent: tributary-qeqc
---

**File:** apps/docs/docs/integration-guide/programmable-pull-payments/examples/native-sol-topup.md

**Known issues (CRITICAL):** This is an act-mode example (output_mint = Pubkey::default()) but likely doesn't document it as such. Settlement description wrong — act mode has NO deliver sweep, NO output ATA, NO >0 guard. If it claims to deliver SOL after swap, that's wrong (act mode doesn't deliver). Stale SDK method names. Missing delegate approval step. Fee path wrong (input-side not documented).

**Read first:** Read the file, then check if output_mint semantics (ADR-0026) apply — this is act mode.

**Current code anchors:** programs/tributary/src/instructions/composable/execute.rs (act mode settle), packages/sdk/src/instructions/composable.ts

**Per ADR:** ADR-0026 (act mode settlement: no deliver, no output ATA, no >0 guard)

**Acceptance:** If act-mode: clearly document that output_mint=Pubkey::default() means no SOL delivery, the forward CPI is the point (e.g. depositing into a program). Fix all stale signatures. Add ponytail: comment noting act mode semantics.

\n\n## Summary of Changes\nFlow diagram added Skim phase. ForwardConfig restructured with nested instructionConstraint. getCreateComposablePolicyInstruction updated to dual-validation signature. Low-level executeComposable accounts updated: preValidationProgram/postValidationProgram named accounts, fee accounts changed to USDC (input-side), PDA derivation added (getPreValidationPda/getPostValidationPda).
