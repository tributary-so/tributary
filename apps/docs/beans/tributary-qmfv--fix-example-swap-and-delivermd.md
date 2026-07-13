---
# tributary-qmfv
title: 'Fix example: swap-and-deliver.md'
status: completed
type: task
priority: critical
created_at: 2026-07-13T11:11:02Z
updated_at: 2026-07-13T12:00:52Z
parent: tributary-qeqc
---

**File:** apps/docs/docs/integration-guide/programmable-pull-payments/examples/swap-and-deliver.md

**Known issues (CRITICAL):** Stale SDK method names. Forward instruction data assembly — ByteRangeCheck offsets/pinned accounts index incorrect. Meteora DLMM program ID may be outdated or wrong. Missing `remainingAccounts` order (ValidationPda + lighthouse accounts + forward accounts). Wrong fee path description. Settlement shape wrong for deliver-transform (output_mint != input_mint, output ATA needed). Missing `InstructionConstraint` construction details.

**Read first:** Read the file, then packages/sdk/src/instructions/composable.ts and programs/tributary/src/constants.rs (ALLOWED_FORWARD_PROGRAMS).

**Current code anchors:** programs/tributary/src/instructions/composable/execute.rs, programs/tributary/src/constants.rs, packages/sdk/src/instructions/composable.ts

**Per ADR:** ADR-0021 (ByteRangeCheck + pinned accounts), ADR-0026 (deliver-transform shape)

**Acceptance:** All code blocks compile. Forward instruction data example is correct for actual Meteora DLMM. remainingAccounts order matches on-chain expectations. Add ponytail: comment noting deliver-transform.

\n\n## Summary of Changes\nFlow description + mermaid updated with input-side skim phase. ForwardConfig restructured with nested instructionConstraint (removed minOutputAmount). getCreateComposablePolicyInstruction updated to dual-validation. executeComposable destructures as array. remainingAccounts comments fixed (SDK does not auto-prepend ValidationPda). minOutputAmount section rewritten to explain removal and post-validation alternative.
