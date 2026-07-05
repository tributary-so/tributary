---
# tributary-nsdw
title: 'Integration tests: composable fee rebase (three settlement shapes)'
status: todo
type: feature
priority: high
created_at: 2026-07-05T07:47:52Z
updated_at: 2026-07-05T07:48:08Z
parent: tributary-vp5n
blocked_by:
    - tributary-brp6
---

Integration tests for the composable fee rebase (milestone tributary-t6gt). Runs against Surfpool.

Acceptance criteria:
- [ ] Shape 1 (deliver, no transform): forward disabled, output_mint == input_mint — pull, skim fee, single-intermediate sweep to recipient. No input-residual path triggers.
- [ ] Shape 2 (deliver, transform): forward enabled (Meteora), output_mint != input_mint — pull, skim fee, forward consumes face, output sweeps to recipient, input residual (forced partial-fill) returns to user.
- [ ] Shape 3 (act): forward enabled, output_mint == sentinel — pull, skim fee, forward consumes input (mock Velocity-style), input residual returns to user, NO output sweep, NO intermediate_output ATA created.
- [ ] Cap basis: PayAsYouGo max_chunk_amount and max_amount_per_period bind on GROSS (face + fee). Test that a face right at the cap passes, face+fee over cap fails.
- [ ] Delegate gross: delegated_amount < face+fee => execute fails with InsufficientDelegatedAmount.
- [ ] Mode-conditional >0 guard: deliver mode with 0 output fails; act mode with no output succeeds.
- [ ] Fee-account denomination: gateway/protocol fee accounts are input_mint ATAs; passing output_mint ATAs fails the constraint.
- [ ] Create-time reject: forward_disabled && output_mint != input_mint => creation fails.
- [ ] Fee-bps hike: raise gateway_fee_bps after policy creation => next execute fails delegate check (accepted consequence of Q2 #1).
- [ ] Fee non-refundable: under-consuming forward returns residual to user but fee was charged on full face — assert fee amount == full face * bps.
- [ ] All tests in tests/ (jest + Surfpool), green.

Parent epic: tributary-vp5n. Blocked-by: program-contract feature.
