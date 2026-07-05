---
# tributary-bevy
title: 'Formal verification: update tributary.qedspec for fee rebase'
status: todo
type: feature
priority: high
created_at: 2026-07-05T07:47:52Z
updated_at: 2026-07-05T07:48:08Z
parent: tributary-vp5n
blocked_by:
    - tributary-brp6
---

Update the formal verification artifacts for the composable fee rebase (milestone tributary-t6gt). Per AGENTS.md, program changes => update tributary.qedspec and recreate the formal_verification/ directory.

Acceptance criteria:
- [ ] tributary.qedspec: add invariants for (a) fee assessed on gross pull only, never on output; (b) intermediate_input residual always returns to user (never recipient, never fee_payer); (c) intermediate_output always sweeps to recipient; (d) deliver mode requires output > 0; (e) delegated_amount >= face + fee; (f) PayAsYouGo caps bind on gross.
- [ ] formal_verification/: regenerate Kani/proptest/Lean artifacts from the updated spec.
- [ ] Settlement-shape properties: the three shapes are disjoint and exhaustive over (forward_enabled, output_mint_is_sentinel).
- [ ] Residual-routing property: no path exists where intermediate_input residual reaches the recipient or fee accounts.
- [ ] Fee-conservation property: sum(protocol_cut + scheduler_cut + referral_pool + gateway_residual) == face * bps / 10000, regardless of forward outcome.

Parent epic: tributary-vp5n. Blocked-by: program-contract feature.
