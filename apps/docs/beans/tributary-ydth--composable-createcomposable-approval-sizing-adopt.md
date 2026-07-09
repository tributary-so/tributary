---
# tributary-ydth
title: Composable createComposable() approval sizing — adopt NET-on-pull fee headroom + decide unbounded cap
status: todo
type: task
priority: low
created_at: 2026-07-09T12:35:00Z
updated_at: 2026-07-09T12:35:00Z
---

Deferred from the createComposable() grill (Q2, 2026-07-09).

## Context

createComposable() is being built NOW mirroring createSubscription(), reusing the existing payment-policy calculate*ApprovalAmount helpers directly (face-based, NO fee headroom). This is the interim: 'similar to payment policies'.

## The deferred work (do this later)

Composable is NET-on-pull (ADR-0026): every execution pulls face + fee. The SPL approve delegated_amount is a TOTAL cap, decremented per pull — so a face-only approval silently exhausts the delegate mid-life (e.g. a subscription composable would stop after the fees consumed the headroom). Fix:

- Add calculateComposableApproval(policyType, gateway): for each variant, take the existing calculate*ApprovalAmount result and wrap it in requiredDelegatedAmount (i.e. gross = face + face*bps/10000) so the total approval covers fees across the whole life.
  - subscription -> (amount+fee) * renewals
  - oneTime -> amount+fee (once)
  - upto -> maxAmount+fee
  - milestone -> sum(amount_i+fee)
  - payAsYouGo -> (maxAmountPerPeriod+fee) * periodsPerYear
- Wire createComposable() to use it as the default when approvalAmount is omitted.

## Open question (resolve when picking this up)

Unbounded cap: existing payment-policy helpers use 1 year (paymentsPerYear) when maxRenewals is null / PayAsYouGo period unbounded. User mentioned '2 years (if not time-limited)' as the intended cap for composable. Decide: keep 1yr parity, or move to 2yr (and whether to also refactor the payment-policy helpers for consistency).

## Relationship

- Related to tributary-nmjf (marked completed but its 'constructor issues full ix bundle incl approve at gross' claim is NOT reflected in code — only the low-level getCreateComposablePolicyInstruction exists). This bean tracks the fee-sizing subset that nmjf's summary described but wasn't actually delivered.
- Depends on the createComposable() interim landing first.

## Acceptance

- [ ] calculateComposableApproval(policyType, gateway) implemented + unit-tested for all 5 variants.
- [ ] createComposable() default approval uses it when approvalAmount omitted.
- [ ] Decide + document the 1yr-vs-2yr unbounded cap.
- [ ] pnpm --filter @tributary-so/sdk build + lint green.
