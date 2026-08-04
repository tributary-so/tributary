---
# tributary-9lxi
title: Fix protocol-reference/composable-policy/security-model.md
status: completed
type: task
priority: high
created_at: 2026-07-13T11:11:13Z
updated_at: 2026-08-04T20:06:33Z
parent: tributary-qeqc
---

**File:** apps/docs/docs/protocol-reference/composable-policy/security-model.md

**Known issues:** CPI signer sanitization not documented. Intermediate ATA ownership (ComposablePolicy PDA, not UserPayment PDA) not documented. Remaining accounts ordering validation (accountsStrict not mentioned). Emergency pause interaction may be wrong. The cold-relayer OR-gate (has_post_validation || has_route_pin) for phase 0 not documented. CF-001 cross-account token-drain fix (indexed PinnedAccounts) not reflected.

**Read first:** Read the file, then programs/tributary/src/instructions/composable/execute.rs.

**Current code anchors:** programs/tributary/src/instructions/composable/execute.rs

**Per ADR:** ADR-0008 (CPI privilege boundary), ADR-0016 (permissionless execution gate), ADR-0021 (cold-relayer OR-gate)

**Acceptance:** All security properties match current code. CPI signer sanitization documented. Intermediate ATA ownership documented. OR-gate for phase 0 documented. Add ponytail: comment.

## Summary of Changes

Verified against current code (programs/tributary/src/instructions/composable/execute_composable.rs, state/composable_policy.rs, constants.rs). Applied surgical fixes for code-drift: stale allowlist (1→4 forward programs per ADR-0032), wrong ByteRangeCheck.offset type (u16→u8), wrong function name (process_output_and_sweep→sweep_output_to_recipient), wrong validation data cap (1024→512 bytes), missing degenerate-pin guard, missing cold-relayer OR-gate (ADR-0016), missing CF-001 indexed PinnedAccount section, missing act-mode settlement shape, missing accountsStrict note, missing PDA seeds/fee path/settlement shapes sections in api-reference. All drafts now match v2.2 / ADR-0026 / ADR-0021 / ADR-0032.
