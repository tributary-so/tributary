---
# tributary-ky9b
title: Extend Use Cases with composable tier
status: completed
type: task
priority: normal
created_at: 2026-06-26T09:30:49Z
updated_at: 2026-06-26T10:09:35Z
parent: tributary-m08g
blocked_by:
    - tributary-breu
---

Extend the useCases array in Home.tsx. Split visually into two tiers: 'LIVE TODAY' (existing payment-side cases: SaaS Subscriptions, Lending & Repayments, Creator Payments, Commerce & Checkout, AI Agent Payments, Milestone-based Work) and 'WHEN COMPOSABLE SHIPS' (new: Generic DCA / auto-buy, Spare-change investing, Automated giving, Treasury auto-rebalance, AI-agent budget-scoped billing, Machine-to-machine settlement, Cold-storage allowance, Yield auto-compound). Add a clear visual divider + tier label between them (e.g. a thin rule + 'NEXT: UNLOCKED BY COMPOSABILITY' eyebrow). Reuse the existing card grid markup. Pull composable use-case copy from the harvested BUILDER_APPS content in Composable.tsx. Verify: two tiers visually distinct, all cards render, copy is vendor-neutral.



## Summary of Changes

- Split useCases into two visually distinct tiers.
- Tier 1 "● LIVE TODAY": existing 6 payment cases (SaaS Subscriptions, Lending & Repayments, Creator Payments, Commerce & Checkout, AI Agent Payments, Milestone-based Work).
- Tier 2 "WHEN COMPOSABLE SHIPS": 8 new cases pulled from the harvested BUILDER_APPS content — Generic DCA/Auto-buy, Spare-change Investing, Automated Giving, Treasury Auto-rebalance, AI-agent Budget Billing, Machine-to-Machine Settlement, Cold-Storage Allowance, Yield Auto-compound.
- Divider with "NEXT: UNLOCKED BY COMPOSABILITY" eyebrow between tiers; tier-2 icons muted to signal not-yet-live.
- Reused the existing card grid markup; copy is vendor-neutral. Build clean.
