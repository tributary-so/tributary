---
# tributary-tp1g
title: 'T4: Setup form steps UI + transitions.dev'
status: completed
type: task
priority: normal
created_at: 2026-06-25T10:48:53Z
updated_at: 2026-06-25T11:15:18Z
parent: tributary-vyg1
blocked_by:
    - tributary-x8k9
---

Build the 4-step form, no submit logic yet: src/pages/Setup.tsx (single page orchestrating steps, holds form state via useState, renders <StepShell> wrappers), src/components/StepShell.tsx (numbered header + texts-reveal intro), src/components/steps/ConnectStep.tsx (shows connected cold wallet + USDC balance via react-query, disabled until connected), src/components/steps/FundingStep.tsx (chunk/period-cap/period-length inputs, period presets Day/Week/Month/custom-seconds), src/components/steps/TargetStep.tsx (hot wallet pubkey input, SOL threshold input -> lamports preview, NATIVE_OUTPUT unwrap Switch default-on), src/components/steps/SwapStep.tsx (DEX dropdown=Meteora only, pool preset Autocomplete + custom-paste input, slippage input), src/components/AccordionAdvanced.tsx (custom gateway pubkey paste, optional). Apply transitions.dev: texts-reveal on step intros, tooltip on field hints, skeleton-reveal on balance load, error-state-shake on invalid pubkey/amount. HeroUI components (Input, Switch, Autocomplete, Button). Verify: form renders, state flows up to Setup, transitions visible.

## Summary of Changes

4-step configuration form with transitions.dev applied:
- transitions.css: _root.css vars + 5 snippets verbatim (texts-reveal, tooltip, skeleton-reveal, error-shake, accordion), each with reduced-motion guard. Imported from index.css.
- components/transitions.tsx: React wrappers (TextsReveal, Tooltip, SkeletonReveal, useErrorShake hook with reflow/replay, Accordion) owning the documented class hooks + JS orchestration.
- lib/form.ts: TopupFormState + INITIAL_FORM + PERIOD_PRESETS.
- components/StepShell.tsx: numbered step wrapper (grid-first, uppercase labels, TextsReveal intro).
- components/steps/ConnectStep.tsx: cold wallet + USDC balance via SkeletonReveal.
- components/steps/FundingStep.tsx: chunk/cap/period (Select presets + custom), Tooltip field hints.
- components/steps/TargetStep.tsx: hot wallet pubkey (ErrorShake on invalid), SOL threshold -> lamports preview, unwrap Switch (NATIVE_OUTPUT).
- components/steps/SwapStep.tsx: DEX dropdown (Meteora only), pool Autocomplete (presets + custom paste), slippage bps.
- components/AccordionAdvanced.tsx: optional existing-gateway override.
- pages/Setup.tsx: owns form state, renders all steps.
- app.tsx: lazy Setup + Suspense fallback.

Verified: tsc -b clean, vite build succeeds (Setup chunk 140KB), lint 0 errors (4 react-refresh warnings matching apps/app co-location convention).
