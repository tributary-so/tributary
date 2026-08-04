---
# tributary-ydth
title: Composable createComposable() approval sizing — adopt NET-on-pull fee headroom + decide unbounded cap
status: completed
type: task
priority: low
created_at: 2026-07-09T12:35:00Z
updated_at: 2026-07-15T20:25:52Z
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

- [x] calculateComposableApproval(policyType, gateway) implemented + unit-tested for all 5 variants.
- [x] createComposable() default approval uses it when approvalAmount omitted.
- [x] Decide + document the 1yr-vs-2yr unbounded cap.
- [x] pnpm --filter @tributary-so/sdk build + lint green.

## Decision: unbounded cap → 1yr parity

Keep the payment-policy helpers' 1-year cap for composable too. Reasons:
- One mental model across both policy families; diverging silently is a footgun.
- The delegate approval is re-issued on every createComposable/approve and is trivially topped up, so 1yr is sufficient.
- 2yr was a mention, not a requirement — YAGNI. If composables in practice need longer, callers pass an explicit approvalAmount (or the year-multiplier changes in one place — calculateSubscriptionApprovalAmount / calculatePayAsYouGoApprovalAmount).

Payment-policy helpers were NOT refactored (out of scope; correct for their family). Documented in the calculateComposableApproval JSDoc.

## Summary of Changes

- **packages/sdk/src/sdk.ts**
  - Added `calculateComposableApproval(policyType, gateway: PaymentGateway | null): BN` — wraps the existing face-only `calculatePolicyApprovalAmount` in `requiredDelegatedAmount` so the delegate covers `face + fee` across the policy's whole life (ADR-0026 NET-on-pull). Degrades to face-only when the gateway is unknown (null → 0 bps).
  - Wired `createComposableWithMetadata` default approval to fetch the gateway and use `calculateComposableApproval` (only when `approvalAmount` is omitted — explicit overrides skip the fetch).
  - Updated the stale "INTERIM" comment on `calculatePolicyApprovalAmount` (no longer interim — it is intentionally face-only; composable wraps it for fees).
- **tests/sdk-composable-constructor.test.ts**
  - New `calculateComposableApproval` suite: all 5 variants (subscription/milestone/payAsYouGo/oneTime/upTo) + null-gateway degradation + 0-bps identity (7 tests).
  - New `createComposable` test proving the default approval now carries the gross (face + fee) amount from the fetched gateway.
  - Hardened `makeSdk` to neutralise the gateway fetch + policy `.all()` RPC calls (the default-approval path now consults the gateway; the metadata step enumerates existing policies).
  - Fixed a stale assertion: `createComposable` emits approve-only (no revoke) when the owner token account has no delegate — corrected the ix count 5 → 4 with a clarifying comment.

Verification: `pnpm --filter @tributary-so/sdk run build` ✓, `tsc --noEmit` clean ✓, `npx jest tests/sdk-composable-constructor.test.ts` → 20/20 passing ✓.
