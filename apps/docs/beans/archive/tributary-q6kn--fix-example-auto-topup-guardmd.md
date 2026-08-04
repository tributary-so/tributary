---
# tributary-q6kn
title: 'Fix example: auto-topup-guard.md'
status: completed
type: task
priority: critical
created_at: 2026-07-13T11:11:02Z
updated_at: 2026-07-13T12:00:50Z
parent: tributary-qeqc
---

**File:** apps/docs/docs/integration-guide/programmable-pull-payments/examples/auto-topup-guard.md

**Known issues (CRITICAL):** Stale SDK API — uses `sdk.createSubscription(...)` or wrong method names for composable. Forward config structure wrong (old 4-pin InstructionConstraint). Fee path wrong — says NET-on-pull not hardcoded; composable always uses input-side fees. Missing `remainingAccounts` assembly for execution. `lighthouse.build()` missing accounts output. Settlement shape wrong — auto-topup is deliver-no-transform (output_mint == input_mint), which needs explicit output_mint == input_mint pattern. Missing delegate approval step.

**Read first:** Read the file, then compare with packages/sdk/src/instructions/composable.ts.

**Current code anchors:** packages/sdk/src/instructions/composable.ts, programs/tributary/src/instructions/composable/execute.rs

**Per ADR:** ADR-0021 (InstructionConstraint), ADR-0026 (deliver-no-transform shape, input-side fees)

**Acceptance:** All code blocks compile. Method signatures match current SDK. Flow matches actual execution (pull → skim → pre-validation → forward → post-validation → settle). Add ponytail: comment noting this is a deliver-no-transform example.

\n\n## Summary of Changes\nForwardConfig restructured with nested instructionConstraint (removed minOutputAmount, flat dataChecks). getCreateComposablePolicyInstruction updated to dual-validation signature. executeComposable return type fixed to TransactionInstruction[]. PolicyType PayAsYouGo padding fixed (expiryDate added). On-chain flow description updated with Skim phase.
