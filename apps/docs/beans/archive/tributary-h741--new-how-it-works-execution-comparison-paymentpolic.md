---
# tributary-h741
title: New 'How It Works' execution comparison (PaymentPolicy vs ComposablePolicy)
status: completed
type: task
priority: high
created_at: 2026-06-26T09:30:10Z
updated_at: 2026-06-26T09:59:15Z
parent: tributary-m08g
---

The tech-heavy credibility section. Build a new component (e.g. HowComposableWorks.tsx) with a toggle/tabs control switching between two execution-flow views: (A) PaymentPolicy — PULL -> SETTLE (single CPI transfer from user token account to recipient + fee split). (B) ComposablePolicy — PULL -> VALIDATE (optional Lighthouse assertion) -> FORWARD+SETTLE (CPI into any whitelisted program, then sweep output to recipient + fees). Each view: a horizontal 3-phase flow diagram (reuse the existing step-node pattern from HowToProcessor.tsx), a short caption per phase, and a TerminalCard code snippet. ComposablePolicy tab includes the Lighthouse facade snippet from the SDK (lighthouse.tokenAccount(...).amount(...).build()) and notes that validation runs before any token moves, forward is allowlisted + instruction-discriminator-locked, intermediate ATAs are force-emptied. Caption the toggle: 'Same primitive, different ROUTE.' Verify: toggle switches both diagrams + code, flow accurate to COMPOSABLE.md Execution Flow section, no vendor names beyond Lighthouse (which is the validation program, named explicitly in the spec).



## Summary of Changes

- New `HowComposableWorks.tsx` component with a PaymentPolicy / ComposablePolicy toggle.
- PaymentPolicy view (● LIVE): 2-phase PULL → SETTLE flow + code showing single-CPI transfer with on-chain fee split.
- ComposablePolicy view (ROADMAP): 3-phase PULL → VALIDATE → FORWARD+SETTLE flow + Lighthouse facade snippet (`lighthouse.tokenAccount(...).amount(...).build()`). Captions note validation runs before any token moves, forward is allowlisted + instruction-discriminator-locked, intermediate ATAs force-emptied.
- Reuses HowToProcessor step-node pattern (numbered badge + icon node + connecting rule) and TerminalCard for code.
- Toggle swaps both diagram and code; caption "Same primitive, different ROUTE."
- Only vendor named is Lighthouse (the validation program, per spec). Wired into Home as `#execution-comparison` section right after the existing HowItWorks.
- Build clean.
