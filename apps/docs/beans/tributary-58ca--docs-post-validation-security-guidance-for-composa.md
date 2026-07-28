---
# tributary-58ca
title: "Docs: post_validation security guidance for composable forward policies"
status: completed
type: feature
created_at: 2026-07-22T12:11:36Z
updated_at: 2026-07-22T12:20:00Z
parent: tributary-mygq
---

Document the post_validation security posture for composable policies, covering all three settlement shapes (ADR-0026):

1. Deliver-no-transform (forward disabled): no gateway manipulation vector, no post_validation needed.
2. Deliver-transform (forward enabled, distinct output_mint): on-chain >0 guard (sweep_output_to_recipient, execute_composable.rs:523) closes the existence + wrong-destination vectors. The GAP is magnitude — a gateway can deliver dust (1 unit) and pass >0. Owners wanting a magnitude floor should add: lighthouse.tokenAccount(intermediateOutputAta).amount(floor, '>=').build() as post_validation.
3. Act mode (sentinel output_mint): NO on-chain guard. post_validation is the ONLY backstop, but the target is use-case-specific (external settlement account). Document that owners MUST understand this and wire an appropriate assertion.

Also add an ADR (0031) locking in the decision: on-chain >0 guard stays as the hard existence floor for deliver-transform; no on-chain enforcement of post_validation (target is use-case-specific for act mode, redundant for deliver-transform); SDK provides defaults/warnings (see sibling SDK feature).

Scope: apps/docs only.

## Summary of Changes

- **ADR-0031** (`apps/docs/adr/0031-settlement-output-post-validation-posture.md`):
  locks in the decision — on-chain `>0` guard stays as the existence floor
  for deliver-transform; no on-chain enforcement of post_validation (act
  mode target is use-case-specific/external; deliver-transform existence
  already covered); SDK provides defaults/warnings. Includes rejected
  alternatives (a)/(c)/(d) and the output-mint substitution vector
  analysis (closed via ATA-derivation check).
- **security-model.md §7** (`apps/docs/docs/protocol-reference/composable-policy/security-model.md`):
  new "Settlement output guards" section with the per-shape coverage table,
  what the `>0` guard closes (no-output, wrong-destination), the magnitude
  gap it doesn't (dust), the owner opt-in magnitude-floor recipe
  (`lighthouse.tokenAccount(intermediateOutputAta).amount(floor, ">=")`),
  act-mode's no-backstop posture, and why on-chain enforcement is rejected
  (cross-ref to ADR-0031).
- mkdocs build passes (`mkdocs build` clean; `--strict` warnings are all
  the pre-existing ADR-outside-docs_dir pattern — same as existing
  forward-cpi-guide → ADR-0030 cross-refs).
