---
# tributary-c206
title: Grep monorepo — find and fix all old API surface occurrences
status: todo
type: task
priority: high
created_at: 2026-07-03T09:44:46Z
updated_at: 2026-07-03T09:45:04Z
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

- [ ] All 7 greps run, output captured
- [ ] Every \"must fix\" hit migrated to the new API surface
- [ ] \`pnpm run lint\` clean across workspace
- [ ] \`pnpm run build\` clean across workspace
- [ ] No new \`console.warn\` from deprecation shims in the apps (apps use the new shape)
- [ ] README examples in \`packages/payments/README.md\` updated

## Handoff references

- \`packages/payments/\` — the refactored package (source of truth for new shapes)
- Sibling features in milestone tributary-f6yh — define the new API surface
- Milestone tributary-f6yh — design decisions (Axis 7)
