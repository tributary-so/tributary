---
# composable-landing-page-rpdd
title: 'Motif pass: ''If This Then Money'' recurring; retire ''composable automation layer'''
status: completed
type: task
priority: normal
created_at: 2026-06-26T21:06:15Z
updated_at: 2026-06-26T21:24:24Z
parent: composable-landing-page-5558
blocked_by:
    - composable-landing-page-fwcj
    - composable-landing-page-lfmu
    - composable-landing-page-05ca
---

Per ADR-0014 motif decision: sweep ALL landing copy so 'If This Then Money' recurs as the canonical handle from hero through knob-section through CTA. Replace every standalone-noun use of 'composable automation layer' / 'composable platform' with either the motif or 'the primitive' (adjective 'composable' survives, noun retired). Align hero/sub-line/section eyebrows/CTA voice to protagonist C (DeFi-native builder/investor) - remove merchant/checkout-language from the main page's voice. Run AFTER B1-B3 so it sweeps the final structural state.



## Summary of Changes

Per ADR-0014 motif decision. RETIRED standalone-noun "composable automation layer" from Home: rewrote the primitive callout (-> "the same primitive composes... Same If/Then, more knobs turned on") and the "What does composable mean?" FAQ answer (-> "the same If/Then composes into automation far beyond payments"). Angel.tsx occurrences left (separate /angel pitch, out of scope). WIRED motif "If This Then Money" to recur beyond the hero: primitive section intro now opens "If This Then Money is literally this primitive's grammar: WHEN... PULL... ROUTE..."; final CTA heading became the motif ("If This Then Money.") with copy re-pointed at protagonist C (build/invest). Aligned CTA voice to C: dropped persona-A "Try Checkout", kept Docs/See-it-running/Get-in-touch. Motif now appears 8x across Home. Lint + build clean.
