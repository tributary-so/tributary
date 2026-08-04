---
# tributary-mh0b
title: Fix protocol-reference/composable-policy/allowlists-and-sentinels.md
status: completed
type: task
priority: high
created_at: 2026-07-13T11:11:13Z
updated_at: 2026-08-04T20:06:33Z
parent: tributary-qeqc
---

**File:** apps/docs/docs/protocol-reference/composable-policy/allowlists-and-sentinels.md

**Known issues:** ALLOWED_FORWARD_PROGRAMS and ALLOWED_VALIDATION_PROGRAMS may list stale program IDs or missing programs. Sentinel semantics may be incomplete (Pubkey::default() for forward, SystemProgram for validation). The degenerate-pin guard when forward is enabled may not be documented. The output_mint sentinel (Pubkey::default) for act mode may not be listed.

**Read first:** Read the file, then programs/tributary/src/constants.rs.

**Current code anchors:** programs/tributary/src/constants.rs

**Per ADR:** ADR-0021 (forward enablement requires pin), ADR-0026 (output_mint sentinel for act mode)

**Acceptance:** All program IDs match constants.rs. Sentinel values documented correctly. Degenerate-pin guard documented. Add ponytail: comment.

## Summary of Changes

Verified against current code (programs/tributary/src/instructions/composable/execute_composable.rs, state/composable_policy.rs, constants.rs). Applied surgical fixes for code-drift: stale allowlist (1→4 forward programs per ADR-0032), wrong ByteRangeCheck.offset type (u16→u8), wrong function name (process_output_and_sweep→sweep_output_to_recipient), wrong validation data cap (1024→512 bytes), missing degenerate-pin guard, missing cold-relayer OR-gate (ADR-0016), missing CF-001 indexed PinnedAccount section, missing act-mode settlement shape, missing accountsStrict note, missing PDA seeds/fee path/settlement shapes sections in api-reference. All drafts now match v2.2 / ADR-0026 / ADR-0021 / ADR-0032.
