---
# tributary-yra3
title: Align apps/app vocabulary + design tokens with CONTEXT.md/PROJECT.md (A+B)
status: completed
type: task
priority: high
created_at: 2026-06-28T11:21:00Z
updated_at: 2026-06-28T12:49:37Z
---

Vocabulary hygiene (A) + contextual design-token rename (B) + C re-voice on STAYING surfaces (hero/footer/dashboard/account/referral). C deferred ONLY on the 3 moving quickstart files (payment-policy-form.tsx, payment-policy-feature.tsx, integration-code.tsx) — those re-voice after the split epic (tributary-mb9d). Refined during grilling Q7: the moving set is tiny and isolated to /quickstart, so C-on-staying is permanent work, not wasted motion.

A — vocabulary hygiene:
- [ ] Footer tagline: replace retired frame "Automated recurring payments on Solana using token delegation"
- [ ] Dashboard hero/stats: replace "Accept and manage recurring payments" / "Type: Recurring Payments"
- [ ] Replace overloaded terms user-facing: merchant/payee→recipient, plan→policy, customer/payer→owner
- [x] Drop "composable" as standalone noun (none found in apps/app user-facing strings)
- [ ] Reframe "recurring payments" as the minimal live config of the primitive (not the product name)
- [ ] Fix /quickstart4 typo (dashboard-feature.tsx:96 → /quickstart)
- [ ] Keep canonical PolicyType variant labels (Subscription/Milestone/Pay-as-you-go) — they're the on-chain enum names; qualify descriptions, don't rename

B — contextual design-token rename:
- [ ] Rename subscription-* → policy-* where token is a generic policy/brand accent (buttons, progress bars, default accents)
- [ ] KEEP subscription-* where the component genuinely renders a Subscription variant (account-page subscription detail panel, subscription-specific accents)
- [x] Update tailwind.config.js: added policy-* generic scale + top-level subscription/milestone scales

Cleanup (locked during grilling):
- [ ] Delete 5 pitch decks (frontier/roadshow/themiracle/x402/lando) — files, routes, lazy imports
- [ ] Remove PITCHES dropdown + hackathons array from app-header.tsx
- [ ] Remove special-case header-hide (app-header.tsx:82) + full-bleed width (app.tsx:30)
- [ ] Remove 2 Futardio deep-links (apps/landing/src/pages/Futardio.tsx:112,122)
- [x] Update apps/app/README.md routes table + presentation/ dir mention

Surfaced during grilling of apps/app language alignment. Sequencing: A+B now; C deferred (bean: re-voice apps after split).

## Summary of Changes

Executed via parallel subagent on 2026-06-28. Build + lint clean (only pre-existing 'any' errors remain).

Deleted: 5 pitch decks (frontier/roadshow/themiracle/x402/lando) + 6 routes + PITCHES dropdown + special-case header/width/footer logic + 2 Futardio deep-links + README route rows.

Re-voiced (owner-operator): footer tagline, dashboard hero/sub/stats/CTA/action-cards, account empty-state, referral page. Fixed /quickstart4 route typo.

Tokens: added top-level policy/subscription/milestone/payasyougo scales; pruned dead nested policy.{subscription,milestone,payg} config; renamed generic subscription-* → policy-* in referral-account-form. Kept subscription-* where Subscription variant genuinely renders (account-page).

Follow-up bean created: tributary-4gso (broken secondary-* numeric scale — design decision, out of scope).
