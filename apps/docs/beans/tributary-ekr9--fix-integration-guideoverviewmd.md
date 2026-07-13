---
# tributary-ekr9
title: Fix integration-guide/overview.md
status: draft
type: task
priority: critical
created_at: 2026-07-13T11:08:54Z
updated_at: 2026-07-13T11:08:54Z
parent: tributary-qeqc
---

**File:** `apps/docs/docs/integration-guide/programmable-pull-payments/overview.md`\n\n**Known issues (moderate):** Execution flow diagram references v1 5-phase model; fee path description omits input-side skim (ADR-0026); settlement shapes missing act/deliver-no-transform; ValidationSpec enum incomplete (pre/post split, Inline variant); instruction list stale (createComposablePolicy vs getCreateComposablePolicyInstruction, missing change_composable_status); `output_mint=Pubkey::default()` semantics missing act mode.\n\n**Current code anchors:** `programs/tributary/src/instructions/composable/`, `packages/sdk/src/instructions/composable.ts`.\n\n**Per ADR:** ADR-0021 (InstructionConstraint), ADR-0026 (input-side fees + settlement shapes), ADR-0022 (fixed-size PDAs).\n\n**Acceptance:** Audit every paragraph against current code. Fix wrong signatures, flows, fee paths. Don't add new content. Leave a ponytail: comment at the top: `// ponytail: flow diagram text matches v2.2; fee path is input-side for composable, NET-on-pull hardcoded.`
