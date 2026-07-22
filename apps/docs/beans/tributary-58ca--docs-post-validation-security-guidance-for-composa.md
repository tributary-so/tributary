---
# tributary-58ca
title: 'Docs: post_validation security guidance for composable forward policies'
status: todo
type: feature
created_at: 2026-07-22T12:11:36Z
updated_at: 2026-07-22T12:11:36Z
parent: tributary-mygq
---

Document the post_validation security posture for composable policies, covering all three settlement shapes (ADR-0026):

1. Deliver-no-transform (forward disabled): no gateway manipulation vector, no post_validation needed.
2. Deliver-transform (forward enabled, distinct output_mint): on-chain >0 guard (sweep_output_to_recipient, execute_composable.rs:523) closes the existence + wrong-destination vectors. The GAP is magnitude — a gateway can deliver dust (1 unit) and pass >0. Owners wanting a magnitude floor should add: lighthouse.tokenAccount(intermediateOutputAta).amount(floor, '>=').build() as post_validation.
3. Act mode (sentinel output_mint): NO on-chain guard. post_validation is the ONLY backstop, but the target is use-case-specific (external settlement account). Document that owners MUST understand this and wire an appropriate assertion.

Also add an ADR (0031) locking in the decision: on-chain >0 guard stays as the hard existence floor for deliver-transform; no on-chain enforcement of post_validation (target is use-case-specific for act mode, redundant for deliver-transform); SDK provides defaults/warnings (see sibling SDK feature).

Scope: apps/docs only.
