---
# tributary-nmjf
title: 'SDK: composable policy constructor with gross-approval + fee-aware helpers'
status: todo
type: feature
priority: high
created_at: 2026-07-05T07:47:52Z
updated_at: 2026-07-05T07:48:08Z
parent: tributary-wsq4
blocked_by:
    - tributary-brp6
---

Update the TypeScript SDK for the composable fee rebase (milestone tributary-t6gt).

Acceptance criteria:
- [ ] createComposablePolicy signature: output_mint becomes OPTIONAL. None / omitted => act-mode sentinel (Pubkey::default()) on-chain. Some(mint) => deliver mode.
- [ ] NEW: requiredDelegatedAmount(face, gatewayFeeBps) => BN — computes gross pull = face + (face * bps / 10000). Pure helper, exported from @tributary-so/sdk.
- [ ] NEW: a composable-policy constructor (buildCreateComposablePolicy or similar) that returns the FULL ix bundle INCLUDING the approve-delegate ix at the gross amount. This is the explicit ask: one call sets up the policy AND approves the correct pull allowance accounting for the new fee model. Must read gateway.gateway_fee_bps to compute gross.
- [ ] NEW: fee-change signal helper — given a policy + current gateway state, detect that gateway_fee_bps has risen since approval and return a re-approve ix at the new gross. (Best-effort; document that bps hikes force re-approval.)
- [ ] executeComposable: signature unchanged (forward_amount = face). Update JSDoc: NET-on-pull hardcoded, caps bind on gross, fee non-refundable on returned residual.
- [ ] Docs in packages/sdk/README or equivalent: the earn-currency shift for gateway operators (fees now input_mint, not output_mint).
- [ ] pnpm run build + lint green.

Parent epic: tributary-wsq4. Blocked-by: program-contract feature (need final on-chain semantics before SDK matches).
