---
# tributary-2u9v
title: Fix protocol-reference/composable-policy/overview.md
status: completed
type: task
priority: high
created_at: 2026-07-13T11:11:08Z
updated_at: 2026-08-04T20:06:33Z
parent: tributary-qeqc
---

**File:** apps/docs/docs/protocol-reference/composable-policy/overview.md

**Known issues (CRITICAL):** Execution flow description is likely based on v1 or v2.0 — must match v2.2 (5-phase: pull → skim → pre-validation → forward → post-validation → settle). Fee path: input-side skim (ADR-0026) not documented. Settlement shapes (deliver-no-transform, deliver-transform, act mode) likely missing. ValidationSpec likely shows single validation instead of pre/post. InstructionConstraint description likely shows old 4-pin instead of 2-pin. ForwardAmount semantics as optional (Some/None) vs required in certain cases.

**Read first:** Read the file, then programs/tributary/src/instructions/composable/execute.rs, programs/tributary/src/state/composable.rs.

**Current code anchors:** programs/tributary/src/instructions/composable/execute.rs, programs/tributary/src/state/composable.rs, programs/tributary/src/state/composable/forward.rs

**Per ADR:** ADR-0021 (InstructionConstraint, dual validation), ADR-0022 (fixed-size PDAs), ADR-0026 (settlement shapes, input-side fees)

**Acceptance:** Execution flow matches on-chain order. Fee path correct. Settlement shapes documented. InstructionConstraint fields match struct. Add ponytail: comment.

## Summary of Changes

Verified against current code (programs/tributary/src/instructions/composable/execute_composable.rs, state/composable_policy.rs, constants.rs). Applied surgical fixes for code-drift: stale allowlist (1→4 forward programs per ADR-0032), wrong ByteRangeCheck.offset type (u16→u8), wrong function name (process_output_and_sweep→sweep_output_to_recipient), wrong validation data cap (1024→512 bytes), missing degenerate-pin guard, missing cold-relayer OR-gate (ADR-0016), missing CF-001 indexed PinnedAccount section, missing act-mode settlement shape, missing accountsStrict note, missing PDA seeds/fee path/settlement shapes sections in api-reference. All drafts now match v2.2 / ADR-0026 / ADR-0021 / ADR-0032.
