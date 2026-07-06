---
# tributary-lmrn
title: Re-align pre-seed pitch to new brand
status: completed
type: feature
priority: high
created_at: 2026-07-03T07:13:46Z
updated_at: 2026-07-03T08:08:43Z
parent: tributary-1gr9
---

Re-align the pre-seed pitch deck (pre-seed.tributary.so/index.md, Marp) to the new brand world. The pitch must tell the SAME story as landing — consistency is the whole point. Several retired nouns and a weaker soul currently live in the deck.

CURRENT STATE (pre-seed.tributary.so/index.md):
- Line 13 — '**The composable automation layer for Solana**' = RETIRED noun (ADR-0015). Must go.
- Line 15 — 'Raising pre-seed to ship self-driving capital.' — 'self-driving' is the demoted gloss, fine as gloss but not the headline.
- Line 53 — 'Money that acts!' — close to soul but weaker than 'Money should move itself.'
- Line 56 — 'all break down to the same primitive' — GOOD, on-brand, keep.
- Line 60 — 'One Primitive: Three Composable Axes' — section title good.
- Lines 62-74 — WHEN/PULL/ROUTE flow + table = the motif grammar made visual. KEEP (on-brand).
- Line 182 — 'transform Tributary from payment protocol to composable automation platform' = BOTH retired nouns in one line.
- Line 214 — 'Automation Layer for Solana' (closing) = retired noun.
- Lines 202-205 — 'Stablecoins made money internet-native. Tributary makes it self-driving.' = good spine, missing the antagonist + new defiant tagline.
- No river/flow visual language anywhere; no 'push' antagonist named.
- Stone palette + Solana purple (#9945ff) — fine, keep palette.

WHAT TO CHANGE (checklist):
- [ ] Line 13 subtitle: replace 'composable automation layer for Solana' with the soul or tagline. Candidate: 'Money should move itself.' or 'Stop pushing your bags. Let them flow.'
- [ ] Line 15: keep raise framing but align voice.
- [ ] Line 53 'Money that acts!' → 'Money should move itself.' (the actual soul).
- [ ] Add the antagonist explicitly somewhere early: push money / the signature tax / 'stop pushing your bags.' The deck currently has no villain — every memorable pitch needs one.
- [ ] Line 182 + 214: retire 'composable automation platform/layer'. Replace with 'the primitive' / 'autonomous capital' / 'money that moves itself.'
- [ ] Closing (202-205): strengthen spine. 'Stablecoins built the balance. Tributary built the riverbed.' + tagline. Fist leads, horizon follows.
- [ ] KEEP: WHEN/PULL/ROUTE flow diagram, metrics (4000+ pulls etc), beachhead (automated investing), economics, founder slide, TAM appendix. These are strong and on-brand.
- [ ] Consider light river visual language in the flow diagram (current/flow styling) — substrate not gimmick.
- [ ] Regenerate index.pdf after edits (Makefile present).

SOURCE OF TRUTH: WORLDBRAND.md §0 (three sentences), §9 (one-paragraph statement).
OUT OF SCOPE: metrics numbers, economics, founder bio, TAM math (unless founder updates). Palette stays.

NOTE: index.html is 135KB (Marp-generated) — edit index.md then rebuild, do not hand-edit the HTML.

VERIFY: grep index.md for 'composable automation layer' / 'composable automation platform' → 0 hits. 'Stop pushing your bags' or 'Money should move itself' present. PDF rebuilt. Story arc matches landing hero.

## Summary of Changes

Applied the locked brand world (WORLDBRAND.md) to this surface as a coordinated voice pass. ADR-0015 structure preserved; only prose touched.

**Brand atoms injected:** soul (`Money should move itself.`), tagline (`Stop pushing your bags. Let them flow.`), antagonist (push money / the signature tax / wallet-as-wheelbarrow), ritual (`set the riverbed once`), banks double-meaning (`Our banks hold flows, not your funds.`), one noun (`the primitive`), one verb (`route`).

**Retired dialects purged:** 'money operating system', 'composable platform', 'composable automation layer', 'Web2-like UX / Web3 sovereignty', 'set it and forget it'.

**QA:** `pnpm run build` green; `pnpm run lint` green on this file; voice audit confirms atoms present. River held as substrate (no puns). ADRs/IDL untouched.
