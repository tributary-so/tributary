---
# tributary-ynhf
title: Update PROJECT.md to v2 primitive framing
status: completed
type: task
priority: normal
created_at: 2026-06-28T07:27:30Z
updated_at: 2026-06-28T07:55:24Z
---

PROJECT.md is v1-era: wrong path (programs/recurring_payments/), claims 5 instructions, no ComposablePolicy, stale 2025 roadmap. Rewrite around the one-primitive model (WHEN/PULL/ROUTE) from CONTEXT.md, add ComposablePolicy (validation+forward hooks) per COMPOSABLE.md, fix facts against README.md.

## Todos
- [ ] Reframe overview around one primitive (If This Then Money, three knobs)
- [ ] Fix path programs/recurring_payments/ -> programs/tributary/
- [ ] Fix instruction count (5 -> 21) and two policy families
- [ ] Add ComposablePolicy section (validation Lighthouse + forward Meteora DLMM)
- [ ] Update roadmap from stale 2025 quarters to v1->v2 maturation arc
- [ ] Update competitive landscape to primitive framing
- [ ] Preserve accurate detail (PolicyType variants, payment comparisons, x402, SDK examples)
- [ ] Update key differentiators

## Summary of Changes

Rewrote PROJECT.md from v1-era framing to the one-primitive model.

- Reframed overview around WHEN/PULL/ROUTE ('If This Then Money'); recurring payments positioned as v1 minimal config, composable as v2 era of same primitive
- Fixed path programs/recurring_payments/ -> programs/tributary/
- Fixed instruction count 5 -> 21 across two policy families
- Added ComposablePolicy section: 3-phase execution (pull/validate/forward), ForwardConfig, ValidationConfig, Lighthouse facade, allowlists
- Replaced stale Q1-Q4 2025 roadmap with v1->v2->next maturation arc along the three knobs; referenced ADRs 0001-0016
- Rewrote competitive landscape around primitive framing (added composable column)
- Updated key differentiators (composable hooks, two policy families, three knobs)
- Preserved accurate detail: PolicyType variants, payment type comparison, schedule model descriptions, x402 middleware/metering/v2 headers, SDK examples
- Aligned facts against README.md (authority on current state) and narrative against CONTEXT.md (authority on framing); COMPOSABLE.md used for v2 spec detail (deferred to README where they disagree on intermediate-ATA ownership)

## Additional Work: COMPOSABLE.md aligned to ADR 0008

Updated COMPOSABLE.md to match ADR 0008 (composable CPI privilege boundary):
- Rewrote the Signing Authority box: dual-PDA model (UserPayment PDA signs only the pull; ComposablePolicy PDA owns intermediates and signs forward/fees/sweep/close)
- Fixed execution flow steps 2/3/4/5/8/10: validation CPI uses plain invoke (no signer seeds, is_signer=is_writable=false); intermediates owned by ComposablePolicy PDA; forward/fees/close signed by ComposablePolicy PDA
- Fixed ExecuteComposable accounts struct comments (user_payment + both intermediate accounts)
- Rewrote PDA Seed Summary table + prose to reflect dual signing authority
- Fixed Security Considerations: signerless validation CPI, dual-authority PDA signing, is_signer sanitization
