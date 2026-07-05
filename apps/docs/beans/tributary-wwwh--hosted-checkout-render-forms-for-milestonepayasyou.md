---
# tributary-wwwh
title: Hosted checkout — render forms for Milestone/PayAsYouGo/OneTime/UpTo policy variants
status: completed
type: milestone
priority: normal
created_at: 2026-07-03T09:42:47Z
updated_at: 2026-07-05T08:10:07Z
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

## Implementation plan (in-progress)

- [x] lib/tributary.ts: add per-variant policy creators (milestone/payAsYouGo/oneTime-policy/upTo) + generic issuePolicyToken
- [x] Per-variant form components: milestone-form.tsx, payasyougo-form.tsx, onetime-policy-form.tsx, upto-form.tsx
- [x] app.tsx: add /policy/* route
- [x] pay-page.tsx: parse #/policy/, switch on sessionData.mode
- [x] checkout-link-form.tsx: emit links for the 4 new variants
- [x] README: document /policy/ + the 4 new modes
- [x] typecheck + lint (typecheck passes; apps/checkout eslint config missing pre-existing — noted)

## Summary of Changes

Shipped the hosted-checkout rendering layer for the 4 new policy variants
(milestone / payAsYouGo / oneTime policy / upTo) plus the unified `/policy/`
route. The merchant-side link generator now emits blobs for all 6 modes.

### Files added
- `apps/checkout/src/components/policy-form-shell.tsx` — shared skeleton
  (wallet-connect prompt, redirecting/confirming, success, JWT issue +
  redirect, cancel modal, wallet footer). Extracted because 4 near-identical
  350-line forms = ~1400 lines of duplication; the shell cuts that to ~50
  lines per variant.
- `apps/checkout/src/components/milestone-form.tsx`
- `apps/checkout/src/components/payasyougo-form.tsx`
- `apps/checkout/src/components/onetime-policy-form.tsx` (policy variant,
  distinct from `pay-form.tsx` which is the direct-transfer `payment` mode)
- `apps/checkout/src/components/upto-form.tsx`

### Files modified
- `apps/checkout/src/lib/tributary.ts` — added `createMilestonePolicy`,
  `createPayAsYouGoPolicy`, `createOneTimePolicy`, `createUpToPolicy`
  + a shared `sendAndConfirmInstructions` helper + a generic
  `issuePolicyToken` (polls `/v1/tokens/issue` keyed on trackingId).
  Pre-existing subscription/payment flows untouched.
- `apps/checkout/src/app.tsx` — added `/policy/*` route → `PayPage`.
- `apps/checkout/src/pay-page.tsx` — hash parser handles `#/policy/`;
  new `renderCheckoutForm()` switch dispatches all 6 modes to the right
  form; heading/subheading copy adapts per mode.
- `apps/checkout/src/components/checkout-link-form.tsx` — rewritten to
  support all 6 modes via a `FormMode` discriminator; per-mode fields
  render conditionally; emits links via `manager.encodeUrl(buildParams())`.
- `apps/checkout/README.md` — documented `/policy/`, the 4 new modes,
  updated component table + features list.

### Verification
- `pnpm exec tsc --noEmit` clean in `apps/checkout`, `packages/payments`,
  `packages/sdk`.
- `pnpm run build` succeeds for `apps/checkout` (after building
  `packages/sdk` — pre-existing requirement).
- `packages/payments` test suite: 192/192 passing (encoding spec + validators
  exercised).
- Spotted pre-existing repo issue: `apps/checkout` has no
  `eslint.config.{js,mjs,cjs}` (sibling apps do), so `pnpm run lint` is
  broken at the repo level independent of this change. Left alone (surgical).

### Out of scope (deferred)
- E2E per variant (encode blob → /policy/{blob} → submit → JWT → redirect).
  Bean scope called for it but it needs a Surfpool + wallet harness.
- Refactor of legacy `checkout-form.tsx`/`pay-form.tsx` onto the new
  `PolicyFormShell` — left untouched to keep the diff surgical.
- Per-variant gateway UI affordance — gateway is hard-coded to
  `config.gateway` (see `defaultGateway()` ponytail comment).
