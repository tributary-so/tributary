---
# tributary-mh0b
title: Fix protocol-reference/composable-policy/allowlists-and-sentinels.md
status: draft
type: task
priority: high
created_at: 2026-07-13T11:11:13Z
updated_at: 2026-07-13T11:11:13Z
parent: tributary-qeqc
---

**File:** apps/docs/docs/protocol-reference/composable-policy/allowlists-and-sentinels.md

**Known issues:** ALLOWED_FORWARD_PROGRAMS and ALLOWED_VALIDATION_PROGRAMS may list stale program IDs or missing programs. Sentinel semantics may be incomplete (Pubkey::default() for forward, SystemProgram for validation). The degenerate-pin guard when forward is enabled may not be documented. The output_mint sentinel (Pubkey::default) for act mode may not be listed.

**Read first:** Read the file, then programs/tributary/src/constants.rs.

**Current code anchors:** programs/tributary/src/constants.rs

**Per ADR:** ADR-0021 (forward enablement requires pin), ADR-0026 (output_mint sentinel for act mode)

**Acceptance:** All program IDs match constants.rs. Sentinel values documented correctly. Degenerate-pin guard documented. Add ponytail: comment.
