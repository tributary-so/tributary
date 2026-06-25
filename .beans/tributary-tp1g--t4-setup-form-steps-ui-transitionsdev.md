---
# tributary-tp1g
title: 'T4: Setup form steps UI + transitions.dev'
status: todo
type: task
priority: normal
created_at: 2026-06-25T10:48:53Z
updated_at: 2026-06-25T10:49:15Z
parent: tributary-vyg1
blocked_by:
    - tributary-x8k9
---

Build the 4-step form, no submit logic yet: src/pages/Setup.tsx (single page orchestrating steps, holds form state via useState, renders <StepShell> wrappers), src/components/StepShell.tsx (numbered header + texts-reveal intro), src/components/steps/ConnectStep.tsx (shows connected cold wallet + USDC balance via react-query, disabled until connected), src/components/steps/FundingStep.tsx (chunk/period-cap/period-length inputs, period presets Day/Week/Month/custom-seconds), src/components/steps/TargetStep.tsx (hot wallet pubkey input, SOL threshold input -> lamports preview, NATIVE_OUTPUT unwrap Switch default-on), src/components/steps/SwapStep.tsx (DEX dropdown=Meteora only, pool preset Autocomplete + custom-paste input, slippage input), src/components/AccordionAdvanced.tsx (custom gateway pubkey paste, optional). Apply transitions.dev: texts-reveal on step intros, tooltip on field hints, skeleton-reveal on balance load, error-state-shake on invalid pubkey/amount. HeroUI components (Input, Switch, Autocomplete, Button). Verify: form renders, state flows up to Setup, transitions visible.
