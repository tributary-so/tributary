---
# tributary-3pu3
title: 'PULL patterns: drop UpTo, reframe section'
status: completed
type: task
priority: normal
created_at: 2026-06-26T09:30:10Z
updated_at: 2026-06-26T10:02:12Z
parent: tributary-m08g
---

Edit the 'Payment Models' section in Home.tsx. (1) Remove the UpTo entry from the paymentTypes array entirely (3 models remain: Subscriptions, Milestones, Pay-as-you-go). Grep for any other UpTo references in the landing app and remove them. (2) Reframe the section header from 'One delegation, four models' to something like 'One delegation, three claim shapes' and update the body copy to explain these are the PULL axis — how value is claimed — and that the same shapes are shared by both PaymentPolicy (direct) and ComposablePolicy (routed) execution paths. Keep the existing card grid markup and the 3 remaining cards' content/features/tags. Verify: 3 cards render, no UpTo anywhere, header copy reflects the unified framing.



## Summary of Changes

- Removed UpTo entry from `paymentTypes` (3 cards remain: Subscriptions, Milestones, Pay-as-you-go).
- Dropped now-unused `CreditCard` import.
- Reframed section header: "One delegation, three claim shapes." with eyebrow "PULL Patterns". Body copy now frames these as the PULL axis shared by both PaymentPolicy (direct) and ComposablePolicy (routed) execution paths.
- Rewrote the "What is Tributary?" FAQ answer to say three claim shapes (no UpTo).
- Removed residual UpTo reference in `Futardio.tsx` near-term roadmap (the only other occurrence in apps/landing/src).
- Build clean.
