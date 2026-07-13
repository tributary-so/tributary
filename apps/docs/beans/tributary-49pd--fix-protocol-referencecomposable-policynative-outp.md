---
# tributary-49pd
title: Fix protocol-reference/composable-policy/native-output.md
status: draft
type: task
priority: high
created_at: 2026-07-13T11:11:13Z
updated_at: 2026-07-13T11:11:13Z
parent: tributary-qeqc
---

**File:** apps/docs/docs/protocol-reference/composable-policy/native-output.md

**Known issues:** Act mode (output_mint=Pubkey::default()) supersedes/redefines what "native output" means. If this doc describes a separate native-SOL settlement path that doesn't match ADR-0026's act/deliver model, it's structurally wrong. Current act mode: no output ATA created, no deliver sweep, no >0 guard, the forward CPI IS the settlement. If this doc claims otherwise, it needs significant fix.

**Read first:** Read the file, then programs/tributary/src/instructions/composable/execute.rs (act mode settle).

**Current code anchors:** programs/tributary/src/instructions/composable/execute.rs

**Per ADR:** ADR-0026 (act mode settlement: no output ATA, no deliver, no >0 guard)

**Acceptance:** The doc must accurately describe act mode as defined in ADR-0026, or be deleted/redirected if it's entirely wrong. Add ponytail: comment.
