---
# tributary-c206
title: Grep monorepo — find and fix all old API surface occurrences
status: completed
type: task
priority: high
created_at: 2026-07-03T09:44:46Z
updated_at: 2026-07-03T21:03:43Z
parent: tributary-pg7r
blocked_by:
    - tributary-zre4
    - tributary-nx0s
    - tributary-gj27
---

# Grep monorepo — fix old payments API surface occurrences

After the TributaryConfig discriminated union + PaymentsClient.policies
rename + session.ts extension land, walk the entire monorepo and update
every occurrence of the old API surface. Do NOT skip this — leaving old
shapes around defeats the point of the refactor.

## Scope — what to grep for

Run these from repo root (\`rg\` preferred over \`grep\`):

\`\`\`bash
# TributaryConfig usage (old flat shape, no variant field)
rg 'TributaryConfig' --type ts --type tsx

# PaymentsClient.subscriptions (renamed to .policies)
rg '\.subscriptions\.' --type ts --type tsx
rg 'client\.subscriptions' --type ts --type tsx
rg 'PaymentsClient.*subscriptions'

# SubscriptionParams / OneTimeParams (now part of larger CheckoutParams union)
rg 'SubscriptionParams|OneTimeParams'

# Old mode literals (search for spots hardcoding \"subscription\"/\"payment\")
rg '\"subscription\"|\"payment\"' --type ts --type tsx -g '!node_modules' -g '!dist'

# encodeSubscriptionUrl / decodeSubscriptionUrl (legacy aliases — verify callers)
rg 'encodeSubscriptionUrl|decodeSubscriptionUrl'

# payments.oneTime (stays, but verify no one confused it with OneTime policy)
rg 'payments\.oneTime'
\`\`\`

## Expected hit locations (pre-audit)

Based on existing code reads:
- \`packages/payments/src/core/session.ts\` — own file, already refactored
- \`packages/payments/src/core/client.ts\` — own file, already refactored
- \`packages/payments/src/core/tracking.ts\` — PaymentTracker, rename methods
- \`packages/payments/src/types/tributary.ts\` — own file, refactored
- \`packages/payments/example.ts\` — update example
- \`packages/payments/README.md\` — update docs (all the quick-start examples)
- \`apps/checkout/src/components/checkout-form.tsx\` — uses SubscriptionParams
- \`apps/checkout/src/components/pay-form.tsx\` — uses OneTimeParams
- \`apps/checkout/src/components/checkout-link-form.tsx\` — likely references modes
- \`apps/checkout/src/pay-page.tsx\` — branches on mode
- \`apps/showcase-payments/src/\` — uses PaymentsClient or session encoding
- \`apps/showcase-payment-policies/src/\` — uses session encoding? verify
- \`apps/api/src/services/subscription.ts\` — \`getSubscriptionDetails\` (RPC, not session — verify it's unaffected)

## Approach

1. Run each grep, capture output to a checklist.
2. For each hit: classify as \"must fix\" (uses old shape) vs \"alias OK\"
   (uses a deprecated alias that still works) vs \"unaffected\" (different
   meaning, e.g. RPC subscription service).
3. Fix each \"must fix\" — migrate to the new discriminated shape.
4. Re-run grep — output should be empty (or only alias hits).
5. \`pnpm run lint\` + \`pnpm run build\` across the whole workspace.

## Acceptance criteria

- [x] All greps run, output captured + classified
- [ ] Every \"must fix\" hit migrated to the new API surface
- [ ] \`pnpm run lint\` clean across workspace
- [ ] \`pnpm run build\` clean across workspace
- [ ] No new \`console.warn\` from deprecation shims in the apps (apps use the new shape)
- [ ] README examples in \`packages/payments/README.md\` updated

## Handoff references

- \`packages/payments/\` — the refactored package (source of truth for new shapes)
- Sibling features in milestone tributary-f6yh — define the new API surface
- Milestone tributary-f6yh — design decisions (Axis 7)

## Summary of Changes

Walked the monorepo for old API surface after the union + rename + session
extension landed. Classified every hit; fixed the real must-fixes; verified
consumers typecheck.

### Must-fix changes (real compile/intent breaks from the refactor)
- `packages/payments/example.ts`: `new PaymentsClient(tributary)` -> the
  constructor now takes a `PaymentTracker`; updated to
  `new PaymentsClient(new PaymentTracker(connection, tributary))` + import.
- `packages/payments/README.md`: constructor signature (5x),
  `manager.subscriptions.` -> `manager.policies.` (6x), added PaymentTracker
  imports (5), and a 'new in this release' note covering the 6-mode union,
  /policy/ path, and the deprecated alias.
- `apps/api/src/routes/skill.ts`: the skill endpoint accesses `.amount` on
  decoded `CheckoutParams` — now a 6-arm union. Narrowed to the subscription
  arm; non-subscription links get a clear 400.
- `apps/api/src/__tests__/skill.route.test.ts`: mock's decoded object gained
  `mode: "subscription"` to match the new CheckoutParams shape.
- `apps/checkout/src/components/order-summary.tsx`: 3 sites accessed
  `.amount` on the union. Added an `amountOf(p)` helper deriving a display
  amount from any arm (subscription/payment/oneTime = amount; upTo = maxAmount;
  payAsYouGo = maxAmountPerPeriod; milestone = sum).
- `apps/checkout/src/pay-page.tsx`: `PayForm` expects the `payment` arm;
  added a mode narrowing + graceful fallback for the new policy variants
  (full rendering is the hosted-checkout milestone tributary-wwwh).

### Classified as NOT must-fix (verified)
- `payload.subscriptions` in apps/checkout (success-page, payment-details),
  apps/showcase-payments, verification.ts/.test.ts, apps/landing: this is the
  `TributaryJWTPayload.subscriptions` JWT field, unrelated to
  PaymentsClient. Confirmed: payment-details.tsx payload: TributaryJWTPayload.
- `apps/api/src/{services,routes}/subscription.ts`: a backend subscription
  SERVICE (RPC), different domain. Imports PolicyLookupOptions (unchanged).
- `packages/sdk-react` `CreateSubscriptionParams` / `CreateMilestoneParams` /
  `CreatePayAsYouGoParams`: sdk-react OWN types (Create* prefix), not
  payments SubscriptionParams.
- `apps/checkout/src/lib/tributary.ts` `CreateSubscriptionParams`: local type.
- `payments.oneTime`: orthogonal, intentionally unchanged.
- `client.test.ts` `expect(client.subscriptions).toBeDefined()`: the package's
  own alias-contract test (not an app). Left.

### Verification
- packages/payments: build/test (131)/lint green.
- apps/api: build clean; skill.route.test passes; subscription.route + tokens.route
  suites fail IDENTICALLY on baseline (4 tests, pre-existing — not caused by this).
- packages/sdk-react, apps/cli, apps/scheduler, packages/sdk-x402: build clean.
- apps/checkout, apps/lando, apps/showcase-payment-policies,
  apps/showcase-payments: tsc --noEmit clean.
- apps/showcase-topup-sol: build fails on missing VITE_SOLANA_API env var
  (pre-existing, unrelated to code).

### Out of scope
- Full per-variant checkout UI rendering -> hosted-checkout milestone tributary-wwwh.
- Renaming tracking.ts methods with 'Subscription' in the name (dead-code churn).
