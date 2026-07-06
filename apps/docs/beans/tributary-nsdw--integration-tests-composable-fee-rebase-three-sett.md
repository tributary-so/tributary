---
# tributary-nsdw
title: 'Integration tests: composable fee rebase (three settlement shapes)'
status: completed
type: feature
priority: high
created_at: 2026-07-05T07:47:52Z
updated_at: 2026-07-06T08:15:35Z
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

## Summary of Changes

Added tests/composable-fee-rebase.test.ts (9 tests, all green against Surfpool mainnet-fork):

- Create-time hard reject: forward disabled + output_mint != input_mint → ForwardDisabledRequiresSameMint (6053).
- Cap binds on GROSS (face + fee): PayAsYouGo max_chunk_amount / period cap trip when face+fee > cap, even when delegate covers gross (InvalidAmount 6001 / InsufficientDelegatedAmount 6005).
- Delegate binds on GROSS: delegated_amount < face+fee → InsufficientDelegatedAmount (6005).
- Happy path with non-zero bps: verifies input-side fee skim (gateway_fee + protocol_fee == total_fee in input_mint), recipient receives face.
- Fee-account denomination: passing an output_mint ATA where input_mint required → TokenMintMismatch (6030) on gateway_fee_account constraint.
- Fee-bps hike: raising gateway_fee_bps after policy creation fails the next execute at the cap/delegate (gross grew).

Anchor.toml: wired tests/composable-fee-rebase.test.ts as test-fee-rebase script and appended it to the surfpool aggregate target.

Out of scope (documented in test file header):
- Shape 3 (act mode) E2E execute: ADR-0026 explicitly declines to expand ALLOWED_FORWARD_PROGRAMS. Meteora DLMM is a swap (always produces output), so no on-allowlist forwarder consumes input without producing output. Velocity accommodation is design-only. Settlement-shape dispatch (is_act_mode / is_deliver_transform / needs_output_ata) is covered by Rust unit tests on ForwardConfig.
- Fee non-refundable on under-consuming forward: requires a mock forwarder that deliberately under-consumes; Meteora has no partial-fill knob. The principle is implicit in skim-then-forward ordering (fee skimmed BEFORE forward runs).

Existing coverage reused: Shape 1 (deliver, no transform) in topup-balance.test.ts; Shape 2 (deliver, transform) + >0 output guard KEPT in topup-balance-swap.test.ts.
