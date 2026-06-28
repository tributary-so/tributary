---
# tributary-m96d
title: Split apps/app into pure owner-dashboard; consolidate creation into apps/checkout
status: todo
type: epic
priority: high
created_at: 2026-06-28T11:21:24Z
updated_at: 2026-06-28T12:16:00Z
---

Confirmed during apps/app language grilling (2026-06-28). Current apps/app is identity-muddled: owner-dashboard + owner-create quickstart + duplicated checkout-link generator (integration-code.tsx) + referral-create.

Decision: 3-app cut (Stripe Dashboard / Stripe Checkout model).
- apps/app = OWNER DASHBOARD (view/manage/activity/delegation/referral-mgmt/future gateway-mgmt). No creation flows.
- apps/checkout = CREATION SURFACE (all flavors): recipient-hosted link+pay (current), owner-direct create (moved from app), composable create (future).
- showcases stay separate until 3rd arrives (ponytail).

Moves:
- [ ] Move payment-policy-form.tsx + payment-policy-feature.tsx from apps/app → apps/checkout (as /create route)
- [ ] Move integration-code.tsx to apps/checkout OR delete (duplicates checkout-link-form.tsx — decide)
- [ ] Delete /quickstart route from apps/app
- [ ] Re-land referral-account-form.tsx in apps/app under a gateway/referral management surface
- [ ] Re-voice apps/app to pure owner-dashboard identity
- [ ] Re-voice apps/checkout to creation-surface identity

Open sub-question: is integration-code.tsx (app's checkout-link generator) a superset/subset/peer of checkout's checkout-link-form.tsx? Resolve before deleting either.

Blocks: re-voice (C) bean — voice depends on final identity of each surface.
Child: gateway management feature.

Rename directive (Fabian, grilling 2026-06-28): during the move, drop the `-form` / `-feature` scaffold suffixes in favor of job-descriptive names. These come from create-solana-dapp and carry no meaning. At minimum applies to the 3 moving files (payment-policy-feature.tsx, payment-policy-form.tsx, integration-code.tsx); convention is disliked repo-wide, so opportunistic renames elsewhere welcome.
