---
# tributary-9lxi
title: Fix protocol-reference/composable-policy/security-model.md
status: draft
type: task
priority: high
created_at: 2026-07-13T11:11:13Z
updated_at: 2026-07-13T11:11:13Z
parent: tributary-qeqc
---

**File:** apps/docs/docs/protocol-reference/composable-policy/security-model.md

**Known issues:** CPI signer sanitization not documented. Intermediate ATA ownership (ComposablePolicy PDA, not UserPayment PDA) not documented. Remaining accounts ordering validation (accountsStrict not mentioned). Emergency pause interaction may be wrong. The cold-relayer OR-gate (has_post_validation || has_route_pin) for phase 0 not documented. CF-001 cross-account token-drain fix (indexed PinnedAccounts) not reflected.

**Read first:** Read the file, then programs/tributary/src/instructions/composable/execute.rs.

**Current code anchors:** programs/tributary/src/instructions/composable/execute.rs

**Per ADR:** ADR-0008 (CPI privilege boundary), ADR-0016 (permissionless execution gate), ADR-0021 (cold-relayer OR-gate)

**Acceptance:** All security properties match current code. CPI signer sanitization documented. Intermediate ATA ownership documented. OR-gate for phase 0 documented. Add ponytail: comment.
