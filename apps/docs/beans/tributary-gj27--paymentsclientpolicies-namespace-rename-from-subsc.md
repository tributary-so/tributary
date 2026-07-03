---
# tributary-gj27
title: PaymentsClient.policies namespace (rename from .subscriptions, soft-deprecate)
status: todo
type: feature
priority: high
created_at: 2026-07-03T09:44:46Z
updated_at: 2026-07-03T09:45:04Z
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
- [ ] Unit tests cover all three methods × {subscription, milestone, payAsYouGo, oneTime, upTo}

## Handoff references

- \`packages/payments/src/core/client.ts\` — the file to change
- \`packages/payments/src/core/tracking.ts\` — PaymentTracker implementation
- Milestone tributary-f6yh — design decisions (Axis 7)
