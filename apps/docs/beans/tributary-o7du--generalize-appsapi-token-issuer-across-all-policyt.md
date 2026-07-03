---
# tributary-o7du
title: Generalize apps/api token-issuer across all PolicyType variants
status: todo
type: feature
priority: high
created_at: 2026-07-03T09:19:46Z
updated_at: 2026-07-03T09:22:50Z
parent: tributary-ml90
blocked_by:
    - tributary-5pd3
---

# Generalize apps/api token-issuer

## What exists today

\`apps/api/src/services/token-issuer.ts\`:
- \`buildSubscriptionClaims(policies)\` (line 91) — **explicitly filters out
  everything except the \`subscription\` variant** at line 96:
  \`if (!(\"subscription\" in p.policyType)) return false;\`
- \`deriveStatus()\` (line 53) — subscription-only (maxRenewals, nextPaymentDue).
- \`computeExpiration()\` (line 216) — subscription-only (nextPaymentDue + buffer).
- \`issueToken()\` (line 237) — orchestrates lookup + claim build + JWT sign.

\`apps/api/src/services/subscription.ts\`:
- \`getSubscriptionDetails()\` (line 62) — strips padding for only 3 variants
  (subscription/payAsYouGo/milestone). **OneTime + UpTo fall through** (lines
  72-95) → \`policyType\` becomes \`undefined\` in the response. Bug-equivalent
  for our purposes.

\`apps/api/src/routes/tokens.ts\` — \`POST /v1/tokens/issue\`, openapi docs.

\`apps/api/src/services/tx-verifier.ts\` — \`verifyTransactionPayment()\` for
the standalone \`transfer\` path. Unchanged.

## What changes

### 1. \`getSubscriptionDetails\` → strip all 5 variants

Rename to \`getPolicyDetails\` (or keep name + extend). Add OneTime and UpTo
padding-strip arms mirroring the existing pattern at
\`subscription.ts:72-95\`. Consider generalizing via a match over the variant
discriminant so future variants can't be silently dropped.

### 2. \`buildSubscriptionClaims\` → \`buildPolicyClaims\`

Drop the subscription-only filter. Build \`PolicyClaim[]\` (the new
discriminated union from \`@tributary-so/payments\`). Per-variant field
mapping per milestone tributary-pzp2 design table.

### 3. \`deriveStatus\` — per-variant

\`\`\`
subscription: paid/overdue/completed              (existing)
milestone:   {stage: \"active\"|\"completed\",
              current: current_milestone,
              total: total_milestones,
              escrowRemaining: u64}
payAsYouGo:  {stage: \"active\"|\"exhausted\",
              capRemainingThisPeriod: u64,
              periodResetsAt: i64}
oneTime:     \"pending\"|\"completed\"|\"expired\"
upTo:        \"pending\"|\"settled\"|\"expired\"
\`\`\`

### 4. \`computeExpiration\` — per-variant

For each policy claim, derive exp from the variant's natural time field:
- subscription: nextPaymentDue + buffer (existing)
- milestone: max(milestone_timestamps) — or default if absent
- payAsYouGo: current_period_start + period_length_seconds — or default
- oneTime: expiry_date if Some, else default
- upTo: deadline (hard)

Default = 1h (configurable via \`JWT_DEFAULT_EXPIRY_SECONDS\` env). Cap at
\`JWT_MAX_TTL_DAYS\` (existing). Final exp = min across all included policies
(already the existing pattern).

### 5. \`issueToken\` orchestration

Same shape: lookup policies → build claims → fetch lastPayments → compute exp
→ sign. Just s/SubscriptionClaim/PolicyClaim/g and s/subscriptions/policies/.

### 6. Route + openapi

Update \`apps/api/src/routes/tokens.ts\` openapi doc — request body shape is
unchanged (still walletPublicKey/recipient/tokenMint/policyAddress/trackingId/
transactionSignature). Response description should mention \"policy claims\"
instead of \"subscription claims\". Add 422 mapping for new error cases
(\"Policy found but not Active\") if added.

### 7. Status filter (optional, defer?)

Today \`buildSubscriptionClaims\` does NOT check status === Active. The
\`getSubscriptionDetails\` layer returns whatever PaymentTracker finds. Decide
whether to filter out \`Completed\` policies from the JWT (probably yes —
expired OneTime/UpTo should not produce long-lived JWTs). Trivial post-filter
in \`buildPolicyClaims\` if desired.

## Out of scope

- \`tx-verifier.ts\` — unchanged (transfer path still works)
- Webhook forwarder, kafka consumer, websocket — unchanged
- New routes (just generalizing the existing \`/v1/tokens/issue\`)

## Acceptance criteria (TDD)

- [ ] \`getPolicyDetails\` returns correct policyType for all 5 variants
- [ ] \`buildPolicyClaims\` emits discriminated PolicyClaim[] for all 5 variants
- [ ] \`deriveStatus\` per-variant — unit tested for each
- [ ] \`computeExpiration\` per-variant — unit tested for each
- [ ] \`issueToken\` returns \`{token, expiresAt}\` with \`policies\` claim populated
- [ ] Integration test: POST /v1/tokens/issue for each variant returns valid JWT
      decoded by \`TributaryVerifier.verify()\` (cross-package)
- [ ] Backward compat: a wallet with only a subscription policy still gets a
      valid JWT (now under \`policies\` instead of \`subscriptions\`)
- [ ] OpenAPI doc regenerated, no missing fields

## Handoff references

- \`apps/api/src/services/token-issuer.ts\` — main file
- \`apps/api/src/services/subscription.ts\` — extend padding-strip
- \`apps/api/src/routes/tokens.ts\` — endpoint + openapi
- \`programs/tributary/src/state/payment_policy.rs\` — on-chain field shapes
- \`packages/payments/src/core/verification.ts\` — PolicyClaim definition (from payments refactor)
- Milestone tributary-pzp2 — design decisions, status/exp table
