---
# tributary-5u5z
title: Fix protocol-reference/composable-policy/forward-hook.md
status: draft
type: task
priority: high
created_at: 2026-07-13T11:11:08Z
updated_at: 2026-07-13T11:11:08Z
parent: tributary-qeqc
---

**File:** apps/docs/docs/protocol-reference/composable-policy/forward-hook.md

**Known issues:** InstructionConstraint likely shows old layout (4 data_checks, 4 pinned_accounts) instead of current (4 data_checks, 2 pinned_accounts). PinnedAccount semantics wrong. Degenerate-pin guard not documented. ByteRangeCheck semantics incomplete. Forward_config.output_mint semantics incomplete (missing deliver-no-transform: output_mint == input_mint, act mode: output_mint == Pubkey::default()). ForwardAmount not discussed as optional field on execute_composable. CPI signer sanitization in forward builder not documented. Allowed forward programs list may be incomplete or stale.

**Read first:** Read the file, then programs/tributary/src/state/composable/forward.rs, programs/tributary/src/constants.rs.

**Current code anchors:** programs/tributary/src/state/composable/forward.rs, programs/tributary/src/constants.rs

**Per ADR:** ADR-0021 (amended pin count 4→2), ADR-0026 (output_mint semantics), ADR-0008 (signer sanitization)

**Acceptance:** InstructionConstraint fields match current struct. output_mint semantics complete. ForwardAmount role documented. Add ponytail: comment.
