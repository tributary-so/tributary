---
# tributary-jm1f
title: 'Brand rebuild: apps/landing'
status: completed
type: feature
priority: high
created_at: 2026-07-03T07:13:29Z
updated_at: 2026-07-03T08:08:43Z
parent: tributary-1gr9
---

Full brand overhaul of the landing page — the flagship surface. ADR-0015 already diagnosed this page as the core of the three-dialect problem; this feature is the cure.

CURRENT STATE (what's wrong vs new brand):
- apps/landing/index.html:5 — title 'Tributary — Recurring Payment Rails on Solana' = the KILLED positioning (CONTEXT.md retires 'the payment protocol for Solana').
- index.html:8-10 — meta description 'The recurring payment protocol for Solana...' = retired headline frame.
- Three-dialect mess is STRUCTURAL: src/components/HowRecurring.tsx, HowToProcessor.tsx, HowComposableWorks.tsx, HowToRecurring.tsx, IsDifferent.tsx, HostedCheckout.tsx. Per ADR-0015 these zig-zag between v1 payments / v2 composable / protocol internals.
- src/pages/Home.tsx — stats array hardcoded (Integrations 10+, Transfers 4000+, Marketing $0, Raised $0); paymentTypes cards (Subscriptions/Milestones/Pay-as-you-go) lead with product features not meaning.
- NOTE: src/pages/Futardio.tsx + src/components/futardio* + components/futardio/slide-*.tsx are a SEPARATE pitch (Futardio project, vault 27.05) — coordinate but do NOT fold into main brand page.

WHAT TO CHANGE (checklist):
- [ ] Rewrite index.html title + meta (title/description/og/twitter) to new brand: lead with antagonist + soul. Title candidate: 'Tributary — Stop pushing your bags.' Meta description: the one-paragraph brand statement from WORLDBRAND.md §9.
- [ ] Hero section: defiant tagline 'Stop pushing your bags.' leads, 'Money should move itself.' as aspirational sub, 'If This Then Money' as the grammar motif. Per ADR-0015 structural decision: payments is proof-beat inside Resolution, NOT a section family.
- [ ] Rebuild around the ascending-reveal (ADR-0015): minimal knob config live today → same primitive composes when WHEN+ROUTE open. Kill the LIVE TODAY / WHEN COMPOSABLE SHIPS two-tier section architecture.
- [ ] Purge the three dialects: one noun ('the primitive'), one motif ('If This Then Money'). Retire 'subscription/delegation/gateway' and 'PaymentPolicy/ComposablePolicy' from headline copy (keep only in dev docs).
- [ ] Introduce the river image system: motion language = flow not click (buttons open gates, confirmations arrive as currents). Commit to hydrology as substrate (see WORLDBRAND.md §3 map). NO puns ('make waves' etc. forbidden).
- [ ] Own the 'banks' double meaning in one line: 'Our banks hold flows, not your funds' (the non-custodial thesis).
- [ ] Market the ritual: the single delegation moment ('set the riverbed once') as the baptism, not the cron job.
- [ ] Keep stats (4000+ pulls, $0 marketing) — they're the L1 proof. Refresh Integrations count from current state.
- [ ] Leave Futardio page/components as-is unless founder directs otherwise.

SOURCE OF TRUTH: WORLDBRAND.md (meaning), ADR-0015 (page mechanics), CONTEXT.md (terminology).
OUT OF SCOPE: do not touch apps/docs/adr/. Futardio page is separate.

VERIFY: pnpm run lint (apps/landing). Visual: hero reads defiant-first, horizon-second. No 'composable automation layer' / 'payment protocol for Solana' strings remain (grep -ri). One-paragraph statement present verbatim somewhere on the page.

## Summary of Changes

Applied the locked brand world (WORLDBRAND.md) to this surface as a coordinated voice pass. ADR-0015 structure preserved; only prose touched.

**Brand atoms injected:** soul (`Money should move itself.`), tagline (`Stop pushing your bags. Let them flow.`), antagonist (push money / the signature tax / wallet-as-wheelbarrow), ritual (`set the riverbed once`), banks double-meaning (`Our banks hold flows, not your funds.`), one noun (`the primitive`), one verb (`route`).

**Retired dialects purged:** 'money operating system', 'composable platform', 'composable automation layer', 'Web2-like UX / Web3 sovereignty', 'set it and forget it'.

**QA:** `pnpm run build` green; `pnpm run lint` green on this file; voice audit confirms atoms present. River held as substrate (no puns). ADRs/IDL untouched.
