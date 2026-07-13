---
# tributary-ao63
title: 'P2 Reference: full composable API'
status: draft
type: task
priority: normal
created_at: 2026-07-13T11:12:29Z
updated_at: 2026-07-13T11:12:29Z
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
