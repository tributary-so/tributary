---
# tributary-kdvt
title: Referral Program explainer fee math uses superseded ADR-0006 model (independent protocol fee, missing scheduler cut)
status: completed
type: bug
priority: high
created_at: 2026-06-30T12:52:45Z
updated_at: 2026-06-30T13:00:12Z
parent: tributary-5gf3
---

## Problem

`ReferralProgramExplainer.tsx` computes the $100-payment breakdown using the
**ADR-0006 two-independent-fees model**, which ADR-0018 (unified fee model)
explicitly superseded. The on-chain authority is `shared/fees.rs::calculate_fees`.

The referral-pool + tier split math itself is CORRECT. The surrounding fee
breakdown is wrong in three ways:

### Bug 1 — Protocol fee charged as independent bps-of-payment (double-counted)

```ts
const protocolFee = 1                                    // $1 = 1% of payment, INDEPENDENT
const recipientReceives = PAYMENT_AMOUNT - protocolFee - gatewayFee  // stacks both
```

ADR-0018: protocol cut is a SHARE of the gateway fee
(`total_fee × protocol_share_bps / 10000`), NOT an independent bps-of-payment.
On-chain `calculate_fees` never subtracts a protocol fee on top of the gateway
fee — it is carved OUT of it. So recipient should receive
`PAYMENT_AMOUNT - gatewayFee`, not `... - gatewayFee - protocolFee`.

### Bug 2 — Scheduler cut absent from the breakdown

ADR-0018 introduced a fourth carve-out: `scheduler_cut = total_fee ×
scheduler_share_bps / 10000` (pays the execute-tx signer; the permissionless-
execution incentive). The explainer has no line for it, so the "Gateway Business
Fee" line (`gatewayFee - referralPool`) silently swallows both protocol AND
scheduler cuts.

### Bug 3 — "Gateway Business Fee" label = gateway residual, miscomputed

Should be `gateway_residual = total_fee - protocol_cut - scheduler_cut - referral_pool`,
not `gatewayFee - referralPool`.

## Fix

Rewrite the breakdown to mirror `shared/fees.rs::calculate_fees` exactly:
total_fee = payment × gateway_fee_bps/10000; four carve-outs; recipient =
payment - total_fee (gross mode). Requires the effective protocol share
(custom if FEATURE_CUSTOM_PROTOCOL_FEE set, else ProgramConfig.protocolShareBps
global default 2000) and the per-gateway scheduler share. Page must fetch
ProgramConfig (singleton) and pass effective protocol share down.

## Verify

- [x] ReferralProgramPage fetches ProgramConfig, computes effective protocol share
- [x] Explainer decomposes gateway fee into 4 carve-outs (protocol/scheduler/referral/residual)
- [x] No standalone protocolFee line; recipient = payment - gatewayFee (gross)
- [x] Referral pool + tier amounts unchanged (already correct)
- [x] referral-program/ lint + typecheck clean (3 pre-existing errors in account-page.tsx are out of scope)
- [ ] `pnpm run typecheck` clean

## Summary of Changes

```
ReferralProgramExplainer.tsx  — rewrote fee breakdown to mirror shared/fees.rs::calculate_fees (gross mode):
                                 total_fee decomposed into protocol / scheduler / referral / residual carve-outs;
                                 recipient = payment - total_fee. Added protocolShareBps prop.
ReferralProgramPage.tsx       — fetches ProgramConfig singleton; resolves effective protocol share
                                 (custom override vs global default) and passes it to the explainer.
```

The referral-pool and 3-tier split math was already correct and is unchanged. The fix corrects the
surrounding breakdown which had used the superseded ADR-0006 two-independent-fees model.

Out of scope (flagged, not fixed): 3 pre-existing `no-explicit-any` errors in account-page.tsx.
