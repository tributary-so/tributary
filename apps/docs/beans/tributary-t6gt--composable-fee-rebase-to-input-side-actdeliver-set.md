---
# tributary-t6gt
title: Composable fee rebase to input-side + act/deliver settlement shapes
status: completed
type: milestone
priority: high
created_at: 2026-07-05T07:46:18Z
updated_at: 2026-07-06T08:30:27Z
---

Rebase composable fees from output-side to input-side (gross pull), hardcode NET-on-pull, introduce act/deliver settlement shape distinction. Motivated by Velocity-style forwards that consume input but produce no output token.

## Design decisions (locked 2026-07-05 design grill)

### Fee model
- Fee assessed on GROSS PULL (face + fee), skimmed from intermediate_input after pull, before forward.
- NET-on-pull hardcoded for composable. Pull = face + fee; forward consumes face. Forward ix encodes amount_in = face — relayer-agnostic, ix-stable. GROSS rejected: mutable bps + no amount-field pin in InstructionConstraint = relayer-integration nightmare.
- Fee accounts flip output_mint → input_mint: gateway_fee_account, protocol_fee_account, scheduler_ata all denominated in input_mint. output_mint stays on the struct for deliver-mode sweep + intermediate_output ATA validation only.
- Earn-currency shift for gateway operators (was output, now input) — pre-launch, no migration beyond fee ATAs must be input_mint.

### Caps and delegate (all gross-denominated, consistency principle)
- delegated_amount >= face + fee.
- PayAsYouGo max_chunk_amount, max_amount_per_period, period accumulator — all bind on GROSS pull.
- forward_amount (caller-supplied) stays as face (what forward consumes, = amount_in in swap ix).
- Fee-bps hikes can fail execution at delegate OR cap — both user-protective, accepted. SDK ships requiredDelegatedAmount(face, gateway) helper + fee-change signal.

### Residual routing (asset separation by what forward touched)
- intermediate_input residual (forward ran, under-consumed) → USER.
- intermediate_output (forward produced) → RECIPIENT.
- Fee non-refundable on authorized gross — user eats fee on returned residual.

### Settlement shapes (three)

| Shape | forward | output_mint | guard |
|---|---|---|---|
| 1. Deliver, no transform (same-mint topup) | disabled | == input_mint | single intermediate, no residual path |
| 2. Deliver, transform (swap) | enabled | set, != input_mint | require!(output_amount > 0) KEPT |
| 3. Act (Velocity/collateral) | enabled | sentinel (Pubkey::default()) | >0 check SKIPPED |

### Create-time hard rejects (new)
- forward_disabled AND output_mint != input_mint — nonsensical, misroutes payment.
- Act mode passes SystemProgram as output_mint account; handler skips output-ATA creation + deliver sweep.

### Accountability
- Deliver mode: Tributary asserts output EXISTS (>0). Output AMOUNT floor is owner's job via post_validation.
- Act mode: Tributary asserts nothing about delivery. Owner's post_validation is the only floor.

### SDK
- createComposablePolicy: output_mint becomes optional (None = sentinel/act mode).
- New helper: requiredDelegatedAmount(face, gateway) — computes gross pull for delegate approval. MUST be part of a composable-policy constructor that also issues the approve ix.
- executeComposable docs: forward_amount = face (unchanged), document NET-on-pull + gross caps.

### Docs
- ADR-0026 (new): this design.
- ADR-0010 amendment (v2.2): >0 guard now mode-conditional.
- ADR-0018 scope note: composable fee path now input-side.
- CONTEXT.md: act/deliver settlement shape terms (done during grill).

### Out of scope
- PaymentPolicy fee path unchanged (still honors FEATURE_NET_AMOUNT flag, fees off payment amount).
- ALLOWED_FORWARD_PROGRAMS expansion (Velocity etc.) — separate decision; this design ACCOMMODATES such forwards but does not add them.
