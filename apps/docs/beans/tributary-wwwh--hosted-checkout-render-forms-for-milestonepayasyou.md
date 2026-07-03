---
# tributary-wwwh
title: Hosted checkout — render forms for Milestone/PayAsYouGo/OneTime/UpTo policy variants
status: todo
type: milestone
priority: normal
created_at: 2026-07-03T09:42:47Z
updated_at: 2026-07-03T09:45:18Z
blocked_by:
    - tributary-f6yh
---

# Hosted checkout — render forms for new policy variants

**Tracking milestone** — consumes the encoding spec + validators from the
sibling \"Payments package\" milestone. Do NOT start until that milestone
ships its encoding + types + \`/policy/\` path support.

## Context

Once \`@tributary-so/payments\` can encode/decode base64 session strings for
all 5 policy variants + direct transfer, the hosted checkout
(\`apps/checkout\`) must grow per-variant forms so a user landing on
\`checkout.tributary.so/policy/{blob}\` can actually create the policy.

Today \`apps/checkout/src/pay-page.tsx\` branches on \`mode === \"subscription\"\`
to render \`CheckoutForm\` (subscription) or \`PayForm\` (direct transfer).
The form patterns to mirror live in
\`apps/showcase-payment-policies/src/components/policy-inputs.tsx\` (~900 lines,
already handles subscription/milestone/payAsYouGo).

## Scope (high-level — refine when this milestone becomes active)

### Implementation

- **Per-variant form components** for milestone, payAsYouGo, oneTime, upto.
  Reuse patterns from \`apps/showcase-payment-policies/src/components/policy-inputs.tsx\`.
  Consider extracting shared form primitives into a workspace package if
  duplication becomes painful.
- **\`pay-page.tsx\` routing** on the \`m\` discriminator — switch renders the
  right form.
- **\`app.tsx\` route addition** — \`/policy/{blob}\` path (alongside existing
  \`/subscribe/\` and \`/pay/\`).
- **\`checkout-link-form.tsx\`** — let merchants generate links for the new
  variants from the checkout app itself (currently subscription/payment only).
- **JWT redirect on success** — mirror \`checkout-form.tsx:82-94\`: after policy
  creation, poll \`/v1/tokens/issue\`, redirect to \`success_url?token=\`.

### Testing

- E2E per variant: encode blob → navigate to \`/policy/{blob}\` → form renders
  → submit → policy created → JWT issued → redirect with token.

### Documentation

- Update \`apps/checkout/README.md\` with the new paths and variant support.

## Why normal priority

The payments-package milestone unblocks 3rd-party apps immediately (they can
encode/decode blobs without hosted checkout). Hosted checkout rendering is
the polished consumer experience — important but not blocking adoption.

## Blocked-by

- Sibling milestone \"Payments package — full PaymentPolicy support + session
  encoding\" (needs encoding spec, types, validators, \`/policy/\` path format).

## Handoff references (read when active)

- \`apps/checkout/src/pay-page.tsx\` — current router
- \`apps/checkout/src/app.tsx\` — current routes
- \`apps/checkout/src/components/{checkout-form,pay-form}.tsx\` — templates
- \`apps/showcase-payment-policies/src/components/policy-inputs.tsx\` — form patterns to mirror
- \`packages/payments/src/core/session.ts\` — the encoding spec (post sibling milestone)
