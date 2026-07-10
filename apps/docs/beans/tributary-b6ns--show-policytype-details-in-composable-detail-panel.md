---
# tributary-b6ns
title: Show PolicyType details in composable detail panel (parity with regular policies)
status: todo
type: task
priority: normal
created_at: 2026-07-10T10:12:15Z
updated_at: 2026-07-10T10:12:15Z
parent: tributary-qpy3
---

ComposablePolicy carries the same PolicyType enum as PaymentPolicy (subscription/milestone/payAsYouGo/oneTime/upTo). The ComposableDetailPanel (account-page.tsx:1376) currently shows only generic stats (paymentCount, totalInput, totalOutput) — no policyType breakdown. The regular policy panels (SubscriptionDetailPanel, MilestoneDetailPanel, PayAsYouGoDetailPanel, OneTimeDetailPanel, UpToDetailPanel) all render type-specific fields from policy.account.policyType.

## Context

- ComposablePolicy.policyType is the same 128-byte fixed union as PaymentPolicy.policyType
- Regular panels switch on: 'subscription' in policy.account.policyType, 'milestone' in, 'payAsYouGo' in, 'oneTime' in, 'upTo' in
- ComposableDetailPanel already receives the policy; policy.account.policyType is available
- The type-specific panels show: amount, frequency, max_renewals, next_payment_due (subscription); milestones + release_condition (milestone); max_chunk_amount, max_amount_per_period (payAsYouGo); amount, due_date (oneTime); max_amount, deadline (upTo)
- Regular panel rendering at account-page.tsx:2062-2236

## Acceptance criteria

- [ ] ComposableDetailPanel renders a policyType section showing the variant-specific fields (amount, frequency, due dates, caps, etc.)
- [ ] Badge/label in the header indicating the policyType variant (e.g. 'Composable · Pay-as-you-go')
- [ ] Reuse the same display/formatting helpers (formatAmount, getInterval, getNextPaymentDue) already passed to regular panels
- [ ] Extract the type-specific field rendering into a shared component or inline block — avoid duplicating all 5 detail panels, but show the equivalent info
- [ ] Lint + typecheck pass
