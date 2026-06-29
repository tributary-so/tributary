---
# tributary-m96d
title: Split apps/app into pure owner-dashboard; consolidate creation into apps/checkout
status: completed
type: epic
priority: high
created_at: 2026-06-28T11:21:24Z
updated_at: 2026-06-28T19:21:12Z
---

Confirmed during apps/app language grilling (2026-06-28). Current apps/app is identity-muddled: owner-dashboard + owner-create quickstart + duplicated checkout-link generator (integration-code.tsx) + referral-create.

REFACTORED during execution (2026-06-28): original plan (move creation to apps/checkout) hit a stack-migration wall — the moved files are HeroUI+jotai shaped, apps/checkout is a different stack. User reframed: owner-direct creation is NOT a checkout (no recipient-hosting), so it becomes its OWN showcase app using apps/app's stack. Clean git mv, no migration.

Decision: apps/app = pure owner dashboard. apps/checkout = recipient-hosted (unchanged). NEW apps/showcase-payment-policies = owner-direct creation reference (same HeroUI stack as apps/app). 3 showcases now exist (topup-sol, payments, payment-policies) — approaching the promote-to-showcases/-folder threshold.

Moves:
- [x] Scaffold apps/showcase-payment-policies (minimal shell, same stack as apps/app: HeroUI/jotai/intl/anchor)
- [ ] Move payment-policy-form.tsx + payment-policy-feature.tsx + integration-code.tsx → new showcase (git mv, rename away from -form/-feature)
- [ ] Port lib/client.ts + lib/token-store.ts (127 lines) into the showcase's src/lib/
- [ ] Delete /quickstart route + QuickStart lazy import from apps/app/src/app.tsx
- [ ] apps/app dashboard: remove creation CTAs (Quickstart card, hero Get Started, Ready-to-set-up banner) → management-only (View your policies → /account)
- [ ] Resolve integration-code.tsx vs checkout/checkout-link-form.tsx: investigate overlap, keep if genuinely useful in showcase context, report finding
- [x] Verify builds: new showcase + apps/app + apps/checkout

NOT moving to apps/checkout anymore (stack mismatch). mb9d (re-voice moving files) folded in lightly — files are already owner-operator voiced from yra3; showcase context may want light reframing.

Blocks: re-voice (C) bean — voice depends on final identity of each surface.
Child: gateway management feature.

Rename directive (Fabian, grilling 2026-06-28): during the move, drop the `-form` / `-feature` scaffold suffixes in favor of job-descriptive names. These come from create-solana-dapp and carry no meaning. At minimum applies to the 3 moving files (payment-policy-feature.tsx, payment-policy-form.tsx, integration-code.tsx); convention is disliked repo-wide, so opportunistic renames elsewhere welcome.

## Summary of Changes

Executed via subagent on 2026-06-28 after reframing the move target (apps/checkout → new apps/showcase-payment-policies) to dodge the HeroUI/Radix stack wall. All 3 builds + lint green.

Extracted apps/app's /quickstart owner-direct creation flow into a new showcase app (same HeroUI stack as apps/app → clean git mv, no migration):
- payment-policy-feature.tsx → showcase-payment-policies/src/components/create-policy.tsx
- payment-policy-form.tsx → showcase-payment-policies/src/components/policy-inputs.tsx (-form suffix dropped per directive)
- integration-code.tsx → showcase-payment-policies/src/components/integration-snippet.tsx

Ported minimal lib/utils (client, token-store, icons) + provider chain into the new app's shell. apps/app/src/components/payment-policy/ deleted (empty).

apps/app is now PURE MANAGEMENT: /quickstart route removed; dashboard CTAs repointed from creation ('Get Started'→/quickstart, 'Ready to set up a policy') to management ('View your policies'→/account, 'Ready to view your policies'); header QUICK START links removed; sitemap + README updated.

integration-snippet vs checkout-link-form: KEPT both (different audiences — showcase = dev exploring + emits JSX+URL; checkout = merchant pay-link). Flagged real dedup candidate: showcase hand-rolls encodeSubscriptionUrl vs checkout's canonical CheckoutSessionManager → follow-up bean tributary-fcmq.

Side effect: 3 showcases now exist (topup-sol, payments, payment-policies) → 'promote to top-level showcases/ folder' threshold reached. Orchestrator/user to call.
