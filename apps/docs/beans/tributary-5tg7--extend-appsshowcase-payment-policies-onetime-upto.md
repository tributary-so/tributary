---
# tributary-5tg7
title: Extend apps/showcase-payment-policies — OneTime + UpTo forms + success/cancel URL + JWT redirect
status: completed
type: feature
priority: high
created_at: 2026-07-03T09:20:50Z
updated_at: 2026-07-05T08:09:36Z
parent: tributary-ml90
blocked_by:
    - tributary-o7du
    - tributary-0h6a
---

# Extend apps/showcase-payment-policies

## What exists today

\`apps/showcase-payment-policies/src/components/policy-inputs.tsx\` (~900 lines):
- Form supports \`subscription\`, \`milestone\`, \`payAsYouGo\` via a
  SelectInput-driven policyType switch.
- Validates per-variant (e.g. milestone has totalMilestones + per-milestone
  amount/date inputs; see lines 187, 287-294).
- Calls \`sdk.createSubscription\`, \`sdk.createMilestone\`,
  \`sdk.createPayAsYouGo\` at lines 309, 340.
- NO \`OneTime\` form section, NO \`UpTo\` form section.
- NO success_url / cancel_url inputs.
- NO JWT issuance on success, NO redirect.

\`apps/showcase-payment-policies/src/components/create-policy.tsx\` (73 lines)
— thin wrapper, no JWT logic.

\`apps/showcase-payment-policies/src/components/integration-snippet.tsx\` —
renders code snippets for \`SubscriptionButton\`, \`MilestoneButton\`,
\`PayAsYouGoButton\`. Needs OneTime + UpTo variants.

No \`pages/\` directory — single-page app, no success page.

## What changes

### 1. Add OneTime form section to \`policy-inputs.tsx\`

Fields:
- amount (required, > 0)
- dueDate (optional date picker; blank = immediate, store <= 0)
- expiryDate (optional date picker; blank = None)

Calls \`sdk.getCreateOneTimePolicyInstruction\` (verify name in
\`packages/sdk/src/instructions/\`). On success → build \`PolicyCreated\`
result with policyPda.

### 2. Add UpTo form section

Fields:
- maxAmount (required, > 0)
- validAfter (optional date picker; blank = immediate)
- deadline (required date picker, must be > validAfter and > now)

Calls \`sdk.getCreateUpToPolicyInstruction\`. Same result shape.

### 3. Add success/cancel URL inputs

Top of form (or below policyType select):
- \`successUrl\` (optional URL)
- \`cancelUrl\` (optional URL)

Mirror \`TributaryConfig\` from \`packages/payments/src/types/tributary.ts\`.
Stored alongside the form data, used post-create.

### 4. On successful policy create → issue JWT + redirect

After the policy is created and confirmed:

\`\`\`ts
const { token } = await issuePolicyToken({
  walletPublicKey: wallet.publicKey,
  recipient,
  tokenMint,
  policyAddress: newPolicyPda,   // optional but precise
  trackingId: memo,
  apiBaseUrl: config.apiBaseUrl,
});

if (successUrl) {
  const url = new URL(successUrl);
  url.searchParams.set(\"token\", token);
  window.location.href = url.toString();
} else {
  navigate(\`/success?token=\${encodeURIComponent(token)}\`);
}
\`\`\`

Use \`issuePolicyToken\` from \`@tributary-so/sdk-react\` (see sdk-react feature).

### 5. Add a Success page (consumer of the token)

Mirror \`apps/showcase-payments/src/pages/Success.tsx\`:
- Use \`useTributaryToken(undefined, API_BASE_URL)\`
- Render \`PolicyDetails\` (a generalized PaymentDetails that handles all
  PolicyClaim variants — discriminated render)
- Back-to-form link

Add \`pages/Success.tsx\`, route it in \`app.tsx\`.

### 6. Update \`integration-snippet.tsx\`

Add code snippets for \`OneTimeButton\` and \`UpToButton\` (mirroring the
existing Milestone/PayAsYouGo snippets at lines 245, 266).

### 7. \`PolicyDetails\` component

Either:
- Generalize the existing \`apps/showcase-payments/src/components/PaymentDetails.tsx\`
  to handle discriminated PolicyClaim variants (preferred — keeps both apps
  consistent), OR
- Local \`apps/showcase-payment-policies/src/components/policy-details.tsx\` if
  the showcase-payments one is too subscription-specific.

Decision: generalize the showcase-payments PaymentDetails and re-export, so
both apps share it.

## Out of scope

- Hosted checkout (apps/checkout) — unchanged for OneTime/UpTo policy flows;
  only naming reframe (see checkout feature).
- 3rd-party app onboarding docs — separate documentation effort.

## Acceptance criteria (TDD)

- [ ] OneTime policy creatable via form (devnet)
- [ ] UpTo policy creatable via form (devnet)
- [ ] Validation errors for invalid inputs (zero amount, past deadline, etc.)
- [ ] success_url with \`?token=\` populated on redirect
- [ ] Success page renders PolicyDetails with correct variant-specific fields
- [ ] Cancel URL honored on cancel button click
- [ ] Existing Subscription/Milestone/PayAsYouGo flows still work
- [ ] Integration snippets for OneTime + UpTo rendered correctly
- [ ] \`pnpm run build\` + \`pnpm run lint\` + \`pnpm run format:check\` clean

## Handoff references

- \`apps/showcase-payment-policies/src/components/policy-inputs.tsx\` — main form
- \`apps/showcase-payment-policies/src/components/create-policy.tsx\` — wrapper
- \`apps/showcase-payment-policies/src/components/integration-snippet.tsx\` — snippets
- \`apps/checkout/src/components/checkout-form.tsx:82-94\` — redirect pattern to mirror
- \`apps/showcase-payments/src/pages/Success.tsx\` — Success page template
- \`apps/showcase-payments/src/components/PaymentDetails.tsx\` — generalize this
- Milestone tributary-pzp2 — design decisions

## Summary of Changes

- src/constants.ts (NEW): API_BASE_URL constant
- src/pages/Success.tsx (NEW): token consumer page mirroring showcase-payments/Success
- src/components/payment-details.tsx (NEW): THIRD copy of PaymentDetails — ponytail EXTRACT-NOW marker added
- src/app.tsx: added /success route
- src/components/policy-inputs.tsx:
  * policyType union extended to 'onetime' + 'upto'
  * PaymentPolicyFormData: added successUrl, cancelUrl, oneTimeDueDate, oneTimeExpiryDate, upToValidAfter, upToDeadline
  * POLICY_TYPE_STYLES: added onetime + upto entries
  * policyType Select: added 'One-time policy' + 'Up-to authorization' options
  * New OneTime form section: amount + dueDate (optional, immediate) + expiryDate (optional, never)
  * New UpTo form section: maxAmount (ceiling) + validAfter (optional, immediate) + deadline (required, future)
  * New success/cancel URL inputs at form bottom
  * Submit handler: onetime → sdk.createOneTimePayment; upto → sdk.createUpToAuthorization
  * Post-create: issuePolicyToken from sdk-react → redirect to success_url?token= OR navigate /success?token=. JWT failure does not roll back the on-chain create.
  * Submit disabled condition extended for onetime/upto
- src/components/create-policy.tsx: seeded new form fields; policyStyle cascade extended
- src/components/integration-snippet.tsx: OneTimeButton + UpToButton imports; live render cases; code-gen cases for both variants
- pnpm exec tsc clean; pnpm exec vite build clean (chunk-size warning pre-existing)
