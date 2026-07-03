---
# tributary-gj27
title: PaymentsClient.policies namespace (rename from .subscriptions, soft-deprecate)
status: in-progress
type: feature
priority: high
created_at: 2026-07-03T09:44:46Z
updated_at: 2026-07-03T20:46:08Z
parent: tributary-pg7r
---

# PaymentsClient.policies namespace rename

## What exists today

\`packages/payments/src/core/client.ts:56\`:
\`\`\`ts
get subscriptions() {
  return {
    checkStatus: async (...) => { /* FIXME */ },
    isActive:    async (...) => { /* FIXME */ },
    getDetails:  async (...) => { /* FIXME */ },
  };
}
\`\`\`
Plus \`payments.oneTime\` (line 39) for transfer-based tracking.

All three \`subscriptions.*\` methods are FIXME stubs today — no behavior to
preserve, just the API surface.

## What changes

### 1. Rename \`subscriptions\` → \`policies\`

\`\`\`ts
get policies() {
  return {
    checkStatus: async (options: PolicyLookupOptions) => { /* impl */ },
    isActive:    async (options: PolicyLookupOptions) => { /* impl */ },
    getDetails:  async (options: PolicyLookupOptions) => { /* impl */ },
  };
}
\`\`\`

The methods should accept any policy variant (the underlying
\`PaymentTracker.getPaymentPoliciesForOptions\` already does — it returns
all matching policies regardless of variant). Filter by variant if the
caller requests it: \`options.variant?: PolicyVariant\`.

### 2. Deprecated alias

\`\`\`ts
/** @deprecated Use .policies instead. Removed next release. */
get subscriptions() {
  console.warn('[Tributary] PaymentsClient.subscriptions is deprecated; use .policies');
  return this.policies;
}
\`\`\`

### 3. Implement the FIXMEs

While renaming, actually implement the three stubs against
\`PaymentTracker\` (which already exists in \`core/tracking.ts\`):
- \`checkStatus\` → \`tracker.checkInitialStatus(trackingId, options)\`
- \`isActive\` → \`tracker.isSubscriptionActive(trackingId, options)\`
- \`getDetails\` → \`tracker.getSubscriptionDetails(trackingId, options)\`

Rename \`tracker\`'s methods too if their names imply subscription-only
(\"isSubscriptionActive\" → \"isPolicyActive\"). Keep deprecated aliases.

### 4. \`payments.oneTime\` stays

Direct-transfer tracking is orthogonal to policy management. Leave
\`payments.oneTime\` as-is.

## Out of scope

- The monorepo-wide grep-and-fix (separate task).
- \`session.ts\` \`create()\` signature change (separate feature).

## Acceptance criteria (TDD)

- [ ] \`client.policies.{checkStatus,isActive,getDetails}\` implemented against PaymentTracker
- [ ] \`client.subscriptions\` deprecated alias delegates with warning
- [ ] Variant filter (\`options.variant\`) honored when present
- [ ] Existing \`payments.oneTime\` unchanged
- [x] Unit tests: checkStatus/isActive/getDetails x variant filtering + alias warning + no-tracker error + oneTime unchanged (10 tests)

## Handoff references

- \`packages/payments/src/core/client.ts\` — the file to change
- \`packages/payments/src/core/tracking.ts\` — PaymentTracker implementation
- Milestone tributary-f6yh — design decisions (Axis 7)

## Work started (bean-f6yh worktree)

Axis 7 rename. Note: the bean references PaymentTracker.checkInitialStatus /
isSubscriptionActive / getSubscriptionDetails, but those methods do NOT exist
on PaymentTracker — only getPaymentPoliciesForOptions does. Implementing the
3 methods as thin derivations over getPaymentPoliciesForOptions (the query
primitive that exists), with the tracker injected via constructor (DI) for
testability. Variant filter applied client-side on the returned policyType.

### Acceptance checklist
- [ ] client.policies.{checkStatus,isActive,getDetails} implemented over getPaymentPoliciesForOptions
- [ ] client.subscriptions deprecated alias delegates with warning
- [ ] Variant filter (options.variant) honored
- [ ] payments.oneTime unchanged
- [ ] Unit tests: all three methods x variant filtering + alias warning
- [ ] existing client.test.ts stays green (alias keeps client.subscriptions defined)
- [ ] pnpm run build + pnpm run lint clean

## Summary of Changes

Axis 7 rename: `PaymentsClient.subscriptions` -> `PaymentsClient.policies`,
plus real (non-stub) implementations of the three query methods.

### Files
- `packages/payments/src/core/client.ts`:
  - `policies` namespace with `checkStatus` / `isActive` / `getDetails`.
    Each derives from `PaymentTracker.getPaymentPoliciesForOptions` (the only
    query primitive that actually exists on PaymentTracker — the bean's
    referenced checkInitialStatus/isSubscriptionActive/getSubscriptionDetails
    do not exist, so the methods are built on what does).
  - `PolicyQueryOptions` (extends PolicyLookupOptions) + optional `variant`
    filter applied client-side on the on-chain `policyType` discriminator.
  - `PolicyStatusSummary` return shape for checkStatus.
  - Deprecated `subscriptions` getter alias — warns + delegates to `policies`.
  - Constructor now accepts an optional `PaymentTracker` (DI) so the methods
    are functional + unit-testable without a live Connection. Without one,
    `.policies.*` throw a clear 'no tracker' error; checkout/oneTime still work.
- `packages/payments/src/__tests__/client-policies.test.ts` (new): 10 tests.

### Verification
- TDD: RED -> GREEN.
- `pnpm test`: 8 suites / 131 tests pass (was 7/121; +1 suite / +10 tests).
- Existing `client.test.ts` stays green — the deprecated alias keeps
  `client.subscriptions` defined (emits a warn on access, as designed).
- `tsc --noEmit` clean; `pnpm run lint` exit 0; `pnpm run build` clean.

### Notes / deviations
- Variant values match the on-chain `policyType` discriminator keys
  (subscription/milestone/payAsYouGo/oneTime/upTo). `variant: "payment"`
  matches no PaymentPolicies (payments are direct transfers, not policies).
- Tracker methods named with 'Subscription' in tracking.ts were NOT renamed
  (only `getPaymentPoliciesForOptions` is consumed; renaming the others is
  dead-code churn left to the grep task / a future cleanup).
- `payments.oneTime` left untouched (orthogonal to policy management).

### Out of scope
- monorepo grep-and-fix for old API surface -> tributary-c206
- session.ts create() signature -> not part of this rename
