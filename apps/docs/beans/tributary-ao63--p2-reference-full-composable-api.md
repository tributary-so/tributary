---
# tributary-ao63
title: 'P2 Reference: full composable API'
status: completed
type: task
priority: normal
created_at: 2026-07-13T11:12:29Z
updated_at: 2026-08-04T20:06:34Z
parent: tributary-9825
---

**File:** new — or can be a landing page/index that cross-references the existing protocol-reference docs

**From checklist §D:** P2 Reference: full composable API. Every instruction, every account.

**Requirements:**

- Every composable instruction: create_composable_policy, execute_composable, delete_composable_policy, change_composable_status
- Every account: ComposablePolicy, ValidationPda (pre + post), intermediate token accounts
- Every struct: PolicyType variants, ForwardConfig, InstructionConstraint, ValidationSpec
- Every PDA seed: composable_policy, composable_validation_pre, composable_validation_post
- Fee path for composable (input-side)
- Settlement shapes (deliver-no-transform, deliver-transform, act mode)
- This can be a structured reference (table-heavy) rather than prose

**Current code anchors:** programs/tributary/src/instructions/composable/, programs/tributary/src/state/composable/

**Acceptance:** Complete and accurate API reference. A developer building an integration can find everything in one place. Cross-references existing protocol-reference docs for deeper explanation.

## Summary of Changes

Verified against current code (programs/tributary/src/instructions/composable/execute_composable.rs, state/composable_policy.rs, constants.rs). Applied surgical fixes for code-drift: stale allowlist (1→4 forward programs per ADR-0032), wrong ByteRangeCheck.offset type (u16→u8), wrong function name (process_output_and_sweep→sweep_output_to_recipient), wrong validation data cap (1024→512 bytes), missing degenerate-pin guard, missing cold-relayer OR-gate (ADR-0016), missing CF-001 indexed PinnedAccount section, missing act-mode settlement shape, missing accountsStrict note, missing PDA seeds/fee path/settlement shapes sections in api-reference. All drafts now match v2.2 / ADR-0026 / ADR-0021 / ADR-0032.
