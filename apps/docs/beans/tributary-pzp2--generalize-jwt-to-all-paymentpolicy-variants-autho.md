---
# tributary-pzp2
title: Generalize JWT to all PaymentPolicy variants (authorization + payment proof)
status: todo
type: milestone
priority: high
created_at: 2026-07-03T09:18:25Z
updated_at: 2026-07-03T09:45:18Z
blocked_by:
    - tributary-f6yh
---

# Generalize JWT to all PaymentPolicy variants

## Context

Today `/v1/tokens/issue` (`apps/api/src/services/token-issuer.ts`) serves two paths:

1. **Subscription (policy-based):** `checkout-form.tsx` creates a `Subscription`
   PaymentPolicy on-chain, then polls `/v1/tokens/issue` with
   `{walletPublicKey, recipient, tokenMint, trackingId}`. `issueToken()` calls
   `getSubscriptionDetails()` → `PaymentTracker.getPaymentPoliciesForOptions()`,
   then `buildSubscriptionClaims()` builds `subscriptions[]` + `lastPayments[]`.
   JWT exp derived from `nextPaymentDue`.
2. **One-time (transfer-based):** `pay-form.tsx` calls `tributary.transfer()`
   (ADR-0004 standalone, NO policy), polls with `transactionSignature`.
   `verifyTransactionPayment()` decodes `PaymentRecord` event from tx logs.

The subscription path is artificially restricted to the `Subscription` variant
by the explicit filter at `apps/api/src/services/token-issuer.ts:96`:
\`\`\`ts
if (!("subscription" in p.policyType)) return false;
\`\`\`
The other four variants (Milestone, PayAsYouGo, OneTime, UpTo) are silently
dropped. `getSubscriptionDetails` (`apps/api/src/services/subscription.ts:72-95`)
also only strips padding for subscription/payAsYouGo/milestone — OneTime and
UpTo fall through (policyType becomes undefined).

## Design decisions (grilled 2026-07-03 with Fabian)

### 1. JWT = authorization proof + payment proof (merchant decides)

Today the JWT is implicitly a "payment receipt." Generalized, it becomes an
**attestation of policy state**: active policies + recent PaymentRecords in
the same token. If \`lastPayments[]\` is empty (PayAsYouGo/UpTo just installed,
no execute yet), the merchant decides whether grant access on authorization
alone. Both aspects travel together; consumers choose what to require.

### 2. All 5 PolicyType variants in scope

Subscription, Milestone, PayAsYouGo, OneTime, UpTo. Each contributes a
discriminated \`PolicyClaim\` carrying variant-specific fields. See
\`programs/tributary/src/state/payment_policy.rs\` for the on-chain shapes.

### 3. OneTime: reframe, don't replace

The existing \`mode: "payment"\` checkout flow uses standalone \`transfer\`
(ADR-0004) — moves money immediately, creates NO policy. This stays, but is
**reframed as "direct payment" / "instant payment"** to distinguish from the
**OneTime PolicyType** (ADR-0019) which installs a single-shot policy
(authorization receipt, full gateway lifecycle, schedulable, pausable,
deletable). Names must not collide in docs, types, or UI copy.

### 4. BREAK \`TributaryJWTPayload\` — discriminated union

\`\`\`diff
- subscriptions: SubscriptionClaim[];
+ policies: PolicyClaim[];   // discriminated union per variant
\`\`\`
Breaking change for consumers (showcase-payments \`Success.tsx\`,
third-party apps). **Acceptable per Fabian.** The \`lastPayments: PaymentRecord[]\`
field stays unchanged.

### 5. Per-variant status + expiration

| Variant     | status vocabulary                         | JWT exp source                         |
| ----------- | ----------------------------------------- | --------------------------------------- |
| Subscription| paid / overdue / completed (existing)     | nextPaymentDue + buffer (existing)      |
| Milestone   | \`{current_milestone}/{total}\`, escrow_remaining | last milestone timestamp (or default) |
| PayAsYouGo  | cap_remaining_this_period, resets_at      | period_end (or default cap)             |
| OneTime     | pending / completed / expired             | expiry_date if set, else default        |
| UpTo        | pending / settled / expired               | deadline (hard)                         |

Default exp when no time-derived field: best-practice JWT upper bound
(configurable, target 1h). Capped at JWT_MAX_TTL_DAYS (existing,
\`apps/api/src/services/token-issuer.ts:20\`).

### 6. Generalization, not new flow

Drop the subscription-only filter; extend \`getSubscriptionDetails\` to strip
OneTime + UpTo padding; generalize claim/status/exp builders per variant.
Confirmed: today's \`buildSubscriptionClaims\` does NOT actually verify
\`paymentCount > 0\` — it lists any matching subscription policy. So the
"authorization-only" semantics already exist for subscriptions; we're
extending the same lenient model to the other variants.

### 7. Setup locus

Hosted setup happens in \`apps/showcase-payment-policies\` (already creates
Subscription/Milestone/PayAsYouGo via \`policy-inputs.tsx\`). Add OneTime +
UpTo forms, add success/cancel URL inputs, issue JWT on successful policy
creation, and redirect to \`success_url?token=\` (mirror checkout's pattern in
\`apps/checkout/src/components/checkout-form.tsx:82-94\`). 3rd-party apps use
the SDK + \`/v1/tokens/issue\` API directly.

## Scope — what does NOT change

- **Program contract (Rust):** unchanged. All 5 PolicyType variants already
  supported; no new instructions, no new accounts.
- **ComposablePolicy:** out of scope (separate account family, separate flow,
  own validation/forward machinery).
- **Standalone \`transfer\` instruction:** stays as the "direct payment" path.

## Tree

\`\`\`
milestone: Generalize JWT to all PaymentPolicy variants
├─ epic: implementation
│  ├─ feature: payments SDK refactor (types + verifier)       [FOUNDATIONAL]
│  ├─ feature: api token-issuer generalization                 [blocked-by payments]
│  ├─ feature: sdk-react updates (verifier + new buttons)      [blocked-by payments]
│  ├─ feature: showcase-payment-policies (OneTime + UpTo + JWT redirect)
│  │                                                           [blocked-by api + sdk-react]
│  └─ feature: checkout naming reframe (direct payment vs OneTime policy)
└─ epic: testing
   ├─ feature: api integration tests (all 5 variants)
   └─ feature: showcase e2e (policy create → JWT → success redirect)
└─ feature: documentation (new ADR + AGENTS.md update)
\`\`\`

## Handoff references (read first)

- \`apps/api/src/services/token-issuer.ts\` — the core file to generalize
- \`apps/api/src/services/subscription.ts\` — extend padding-strip for OneTime/UpTo
- \`apps/api/src/routes/tokens.ts\` — endpoint shape, openapi
- \`packages/payments/src/core/verification.ts\` — TributaryJWTPayload, TributaryVerifier
- \`packages/sdk-react/src/hooks/useTributaryToken.ts\` — consumer hook
- \`apps/checkout/src/components/checkout-form.tsx:82-94\` — redirect-with-token pattern
- \`apps/checkout/src/lib/tributary.ts\` — issueSubscriptionToken / issueOneTimeToken polling helpers
- \`apps/showcase-payments/src/pages/Success.tsx\` — token consumer reference
- \`apps/showcase-payment-policies/src/components/policy-inputs.tsx\` — existing policy form to extend
- \`programs/tributary/src/state/payment_policy.rs\` — on-chain PolicyType shapes
- ADR-0019 (OneTime policy), ADR-0020 (UpTo), ADR-0004 (standalone transfer)
