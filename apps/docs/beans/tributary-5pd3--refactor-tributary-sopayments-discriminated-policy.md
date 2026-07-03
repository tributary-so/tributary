---
# tributary-5pd3
title: Refactor @tributary-so/payments — discriminated PolicyClaim union + verifier generalization
status: todo
type: feature
priority: high
created_at: 2026-07-03T09:19:14Z
updated_at: 2026-07-03T09:22:28Z
parent: tributary-ml90
---

# Refactor @tributary-so/payments for all PolicyType variants

**FOUNDATIONAL** — blocks the api + sdk-react features.

## What exists today

\`packages/payments/src/core/verification.ts\`:
- \`SubscriptionClaim\` interface (lines 25-39) — 12 fields, all
  subscription-specific (amount, paymentFrequency, nextPaymentDue, maxRenewals,
  autoRenew).
- \`TributaryJWTPayload\` (lines 56-66): \`subscriptions: SubscriptionClaim[]\`.
- \`TributaryVerifier.verifySubscription()\` (lines 146-193) — checks
  \`status === \"paid\"\`, subscription-specific.
- \`verifyPayment()\` (lines 117-144) — for transfer-based one-time; stays.

\`packages/payments/src/types/tributary.ts\` — TributaryConfig, line items,
session types. Subscription-shaped.

\`packages/payments/src/core/session.ts\` + \`client.ts\` — checkout session
encoding. \`mode: \"subscription\" | \"payment\"\`. Stays.

## What changes

### 1. New discriminated \`PolicyClaim\` union

Replace \`SubscriptionClaim\` with a discriminated union covering all 5
variants. Discriminator: \`variant: \"subscription\" | \"milestone\" |
\"payAsYouGo\" | \"oneTime\" | \"upTo\"\`. Common fields (policyAddress,
policyId, recipient, gateway, memo, createdAt, status) on the base; variant-
specific fields per arm.

Variant-specific fields (mirror \`programs/tributary/src/state/payment_policy.rs\`):

- **subscription**: amount, paymentFrequency, totalPayments, nextPaymentDue,
  autoRenew, maxRenewals (existing SubscriptionClaim shape)
- **milestone**: milestoneAmounts[4], currentMilestone, totalMilestones,
  escrowAmount, escrowRemaining, releaseCondition
- **payAsYouGo**: maxAmountPerPeriod, maxChunkAmount, periodLengthSeconds,
  currentPeriodStart, currentPeriodTotal, capRemainingThisPeriod,
  periodResetsAt
- **oneTime**: amount, dueDate, expiryDate
- **upTo**: maxAmount, validAfter, deadline

Status vocabulary per variant — see milestone tributary-pzp2 table.

### 2. BREAK \`TributaryJWTPayload\`

\`\`\`diff
interface TributaryJWTPayload {
  sub, iss, aud, iat, exp, jti, nbf   // unchanged
- subscriptions: SubscriptionClaim[];
+ policies: PolicyClaim[];
  lastPayments: PaymentRecord[];       // unchanged
}
\`\`\`

### 3. Generalize \`TributaryVerifier\`

- Add \`verifyPolicy(token, options)\` — finds a policy claim matching
  recipient (+ optional variant filter). Replaces \`verifySubscription\`.
- Keep \`verifyPayment(token, options)\` for transfer-based one-time proofs.
- Deprecate \`verifySubscription\` with an alias that delegates to
  \`verifyPolicy({variant: \"subscription\"})\` — soft landing, one release.

### 4. Update tests

- \`packages/payments/src/core/verification.test.ts\` — port to PolicyClaim.
- \`packages/payments/src/core/verification.e2e.test.ts\` — port fixtures.

### 5. Export the new types

\`packages/payments/src/index.ts\` — re-export \`PolicyClaim\`,
\`TributaryJWTPayload\` (new shape). Drop \`SubscriptionClaim\` after one
release window OR keep as deprecated alias.

## Out of scope

- Checkout session encoding for OneTime/UpTo policies (hosted checkout stays
  Subscription + transfer). Tracked separately if needed.
- \`@tributary-so/sdk\` low-level instruction helpers — already exist for all
  variants.
- Payments client (\`PaymentsClient\`) subscription status methods — out of
  scope, those are RPC-based not JWT-based.

## Acceptance criteria (TDD)

- [ ] \`PolicyClaim\` discriminated union defined with all 5 variants
- [ ] \`TributaryJWTPayload.policies\` field replaces \`subscriptions\`
- [ ] \`TributaryVerifier.verifyPolicy\` implemented
- [ ] \`verifySubscription\` deprecated alias kept (one release)
- [ ] All existing \`verification.test.ts\` cases ported and green
- [ ] All existing \`verification.e2e.test.ts\` cases ported and green
- [ ] \`pnpm run build\` + \`pnpm run lint\` clean in \`packages/payments\`
- [ ] No \`SubscriptionClaim\` references in emitted \`.d.ts\` (post-build grep)

## Handoff references

- \`packages/payments/src/core/verification.ts\` — the file to change
- \`programs/tributary/src/state/payment_policy.rs\` — on-chain field shapes
- Milestone tributary-pzp2 — design decisions (per-variant status/exp table)
