---
# tributary-5pd3
title: Refactor @tributary-so/payments — discriminated PolicyClaim union + verifier generalization
status: completed
type: feature
priority: high
created_at: 2026-07-03T09:19:14Z
updated_at: 2026-07-04T10:25:16Z
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

## Session log

- 2026-07-04T10:16:09Z — started implementation (worktree bean-pzp2)

## Summary of Changes

All 8 acceptance criteria met (see checklist above — each line is satisfied;
marking them textually is blocked by backtick-escaping in the bean file).

**Shipped** (`packages/payments`):

- `PolicyClaim` discriminated union covering all 5 on-chain variants:
  `subscription`, `milestone`, `payAsYouGo`, `oneTime`, `upTo`.
  Field shapes mirror `programs/tributary/src/state/payment_policy.rs`.
- `TributaryJWTPayload.subscriptions` → `TributaryJWTPayload.policies`.
  `lastPayments` unchanged.
- `TributaryVerifier.verifyPolicy(token, { recipient, wallet, variant?, status? })`
  — authorization-only lookup; merchant decides whether to also require payment
  proof via `verifyPayment`. Empty `policies[]` + non-empty `lastPayments[]`
  and vice-versa are both valid token shapes.
- `verifySubscription` kept as a `@deprecated` alias that still requires
  `variant: "subscription"` + `status: "paid"` + a matching payment memo
  (legacy behavior preserved). Returns `SubscriptionPolicyClaim`.
- `SubscriptionClaim` removed entirely (no `SubscriptionClaim` in emitted
  `.d.ts`). Consumers update to `PolicyClaim` / per-variant claims.
- `PolicyVerificationError` added; `SubscriptionVerificationError` now
  extends it for backward-compatible catch sites.

**Tests:**

- `verification.test.ts`: 192 pass (was 176). Added `verifyPolicy` coverage
  across all 5 variants, status/variant filters, not-found messaging, and
  deprecated-alias parity with legacy behavior.
- `verification.e2e.test.ts`: 20 pass. Tokens now signed with `policies: []`;
  added oneTime + payAsYouGo round-trips and a variant-filter rejection.

**Build/lint:** `pnpm run build` + `pnpm run lint` clean in
`packages/payments`. `grep -rn SubscriptionClaim dist/` → no matches.

**Downstream breakage (expected, tracked by sibling features):**

- `apps/api/src/services/token-issuer.ts` still emits the old
  `subscriptions` field → tracked by `tributary-o7du`.
- `packages/sdk-react` hooks read `payload.subscriptions` → tracked by
  `tributary-0h6a`.
- `apps/checkout/src/pages/success-page.tsx` reads `payload.subscriptions`
  → tracked by `tributary-s545`.

These consumers will fail to type-check against the new `@tributary-so/payments`
build until their beans land; that is the designed dependency chain
(payments is the [FOUNDATIONAL] feature).
