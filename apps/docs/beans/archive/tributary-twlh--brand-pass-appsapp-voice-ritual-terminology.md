---
# tributary-twlh
title: 'Brand pass: apps/app (voice + ritual + terminology)'
status: completed
type: feature
priority: normal
created_at: 2026-07-03T07:14:31Z
updated_at: 2026-07-03T08:08:43Z
parent: tributary-1gr9
---

Lighter brand pass on the dashboard app — it's a functional tool, not a marketing surface. Work is voice/terminology consistency + marketing the ritual moment, NOT a rebuild.

CURRENT STATE:
- apps/app/README.md:1 — 'A modern React application for automated recurring payments on Solana. Web2 subscription UX with Web3 transparency using token delegation.' = old vocabulary.
- README:3 — 'Overview' repeats 'recurring payments' framing.
- Stack: Vite + React 19 + Tailwind 4 + HeroUI + Jotai + TanStack Query (apps/app/README.md:13-26).
- Custom fonts loaded: public/gt-cinetype.ttf, public/denim.ttf (relevant — brand font decision should land here consistently with landing).
- Components: app-header, app-footer, dashboard/, account/, referral-program/, cluster/, solana/ (apps/app/src/components/).
- This is where users DO the delegation ritual (approve UserPayment PDA as delegate) — the brand's baptism moment lives in this UI.

WHAT TO CHANGE (checklist):
- [ ] README rewrite: lead with soul ('Money should move itself.') + one-paragraph statement. Retire 'recurring payments' as the lead frame; it's the minimal config of the primitive.
- [ ] Voice pass on user-facing copy (app-header, empty states, CTAs): defiant-but-helpful register. Users here are already converted; tone = empowerment not pitch.
- [ ] THE RITUAL: the approve-delegation step is the brand's core ritual ('set the riverbed once'). Make that moment feel symbolic — it's the single signature that turns a balance into a flow. This is the highest-leverage brand touchpoint in the app.
- [ ] Terminology consistency with landing: 'the primitive' (not 'the platform'), 'route' (not 'send/pay/transfer' — those are push verbs), 'flow' language for motion.
- [ ] Confirm custom fonts (gt-cinetype, denim) align with landing font choice — pick ONE brand type system across landing+app+docs.
- [ ] Keep all functional labels technically accurate (these are operators managing policies); do NOT rename UI fields for brand at the cost of clarity.

SOURCE OF TRUTH: WORLDBRAND.md section 8 (concrete proposals), section 10 (voice rules).
OUT OF SCOPE: no functional/behavioral changes. No wallet-adapter or policy-logic changes.

VERIFY: pnpm run lint (apps/app). README contains the soul line. Delegation approval step copy reviewed against the ritual framing.

## Summary of Changes

Applied the locked brand world (WORLDBRAND.md) to this surface as a coordinated voice pass. ADR-0015 structure preserved; only prose touched.

**Brand atoms injected:** soul (`Money should move itself.`), tagline (`Stop pushing your bags. Let them flow.`), antagonist (push money / the signature tax / wallet-as-wheelbarrow), ritual (`set the riverbed once`), banks double-meaning (`Our banks hold flows, not your funds.`), one noun (`the primitive`), one verb (`route`).

**Retired dialects purged:** 'money operating system', 'composable platform', 'composable automation layer', 'Web2-like UX / Web3 sovereignty', 'set it and forget it'.

**QA:** `pnpm run build` green; `pnpm run lint` green on this file; voice audit confirms atoms present. River held as substrate (no puns). ADRs/IDL untouched.
