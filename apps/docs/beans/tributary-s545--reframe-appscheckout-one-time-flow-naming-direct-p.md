---
# tributary-s545
title: Reframe apps/checkout one-time flow naming (direct payment vs OneTime policy)
status: todo
type: feature
priority: normal
created_at: 2026-07-03T09:21:20Z
updated_at: 2026-07-03T09:22:28Z
parent: tributary-ml90
---

# Reframe apps/checkout one-time naming

Per Fabian (2026-07-03 grilling, milestone tributary-pzp2 decision #3):
the existing \`mode: \"payment\"\` flow uses the **standalone \`transfer\`
instruction (ADR-0004)** — moves money immediately, creates NO policy. This
collides conceptually with the **OneTime PolicyType** (ADR-0019) which
installs a single-shot policy.

Names must distinguish clearly.

## What exists today

\`apps/checkout/src/components/pay-form.tsx\` — uses \`tributary.transfer()\`,
\`createOneTimePayment\`, \`issueOneTimeToken\`. UI copy says \"Complete
payment\" / \"One-time\" badge.

\`apps/checkout/src/lib/tributary.ts:260-351\` — \`CreateOneTimePaymentParams\`,
\`createOneTimePayment\`, \`issueOneTimeToken\`.

\`packages/payments/src/types/tributary.ts\` — \`mode: \"payment\" |
\"subscription\"\`.

\`packages/payments/src/core/session.ts\` — encodes \`mode\` into URL.

## What changes

### 1. UI copy reframe (minimal)

- Badge \"One-time\" → \"Direct payment\" (or \"Instant payment\")
- Page title \"Complete Payment\" stays or becomes \"Complete Direct Payment\"
- Add a tooltip/help text: \"Funds transfer immediately. For scheduled or
  policy-based one-time payments, use the OneTime policy flow.\"

### 2. Type / function naming

In \`apps/checkout/src/lib/tributary.ts\`:
- \`CreateOneTimePaymentParams\` → \`CreateDirectPaymentParams\`
- \`createOneTimePayment\` → \`createDirectPayment\`
- \`issueOneTimeToken\` → \`issueDirectPaymentToken\` (or just reuse the
  generalized \`issuePolicyToken\` once it lands — but transfer-based payments
  will still use \`transactionSignature\` not \`policyAddress\`, so the
  helper shape is slightly different; keep a dedicated helper)

Keep deprecated aliases for one release to avoid breaking 3rd-party forks.

### 3. \`mode\` value

\`packages/payments/src/types/tributary.ts\`: \`mode: \"payment\"\` stays (it's
serialized in URLs; changing breaks outstanding checkout links). Add a doc
comment clarifying it means direct SPL transfer, not OneTime policy.

### 4. Doc cross-reference

In the checkout \`README.md\` (or \`PROJECT.md\`), add a short section:
\"Direct payment vs OneTime policy\" explaining the distinction and pointing
to showcase-payment-policies for the policy-based flow.

## Out of scope

- Switching the checkout one-time flow from \`transfer\` to the OneTime policy.
  Explicitly rejected in the grilling — \`transfer\` stays for hosted checkout.
- Multi-policy checkout UI.

## Acceptance criteria

- [ ] UI copy no longer says \"One-time\" where it means direct transfer
- [ ] \`lib/tributary.ts\` functions renamed; deprecated aliases kept
- [ ] \`mode: \"payment\"\` documented as direct transfer
- [ ] \`apps/checkout/README.md\` (or PROJECT.md) has the distinction section
- [ ] \`pnpm run build\` + \`pnpm run lint\` clean in \`apps/checkout\`
- [ ] Manual smoke: subscription checkout + direct payment checkout both still
      redirect with a valid token

## Handoff references

- \`apps/checkout/src/components/pay-form.tsx\` — UI copy
- \`apps/checkout/src/lib/tributary.ts\` — function names
- \`packages/payments/src/types/tributary.ts\` — \`mode\` field
- ADR-0004 (standalone transfer), ADR-0019 (OneTime policy)
- Milestone tributary-pzp2 — design decision #3
