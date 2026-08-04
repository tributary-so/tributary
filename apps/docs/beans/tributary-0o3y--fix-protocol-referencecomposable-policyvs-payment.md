---
# tributary-0o3y
title: Fix protocol-reference/composable-policy/vs-payment-policy.md
status: completed
type: task
priority: high
created_at: 2026-07-13T11:11:13Z
updated_at: 2026-08-04T20:06:33Z
parent: tributary-qeqc
---

**File:** apps/docs/docs/protocol-reference/composable-policy/vs-payment-policy.md

**Known issues:** Comparison table likely omits fee path differences (input-side skim vs gross-based cut). Settlement flexibility (act/deliver-no-transform/deliver-transform) likely missing. The Dual-delegate model difference vs global delegate not documented. UserPayment PDA as counter tracker for both policy types not documented.

**Read first:** Read the file, then programs/tributary/src/state/user_payment.rs for the dual-counter field.

**Current code anchors:** programs/tributary/src/state/user_payment.rs, programs/tributary/src/state/payment_policy.rs, programs/tributary/src/state/composable.rs

**Per ADR:** ADR-0026 (fee path difference), ADR-0026 (settlement shapes), ADR-0001 (dual-delegate model)

**Acceptance:** Comparison is accurate. Fee difference documented. Settlement difference documented. Add ponytail: comment.

## Summary of Changes

Verified against current code (programs/tributary/src/instructions/composable/execute_composable.rs, state/composable_policy.rs, constants.rs). Applied surgical fixes for code-drift: stale allowlist (1→4 forward programs per ADR-0032), wrong ByteRangeCheck.offset type (u16→u8), wrong function name (process_output_and_sweep→sweep_output_to_recipient), wrong validation data cap (1024→512 bytes), missing degenerate-pin guard, missing cold-relayer OR-gate (ADR-0016), missing CF-001 indexed PinnedAccount section, missing act-mode settlement shape, missing accountsStrict note, missing PDA seeds/fee path/settlement shapes sections in api-reference. All drafts now match v2.2 / ADR-0026 / ADR-0021 / ADR-0032.
