---
# composable-landing-page-05ca
title: Kill live/roadmap split; ascending reveal + fold ROUTE into knobs
status: completed
type: task
priority: high
created_at: 2026-06-26T21:06:15Z
updated_at: 2026-06-26T21:20:48Z
parent: composable-landing-page-5558
---

Per ADR-0014: the two-tier 'LIVE TODAY / WHEN COMPOSABLE SHIPS' Use Cases divider is dead - it re-asserts two products. Replace with ONE ascending list: minimal knob config live today, same primitive composes when WHEN+ROUTE open. Reframe the execution toggle (HowComposableWorks) from 'PaymentPolicy vs ComposablePolicy rivalry' to 'same primitive, two knob configs' (minimal config live, full config next). Fold the standalone ROUTE Targets card grid (#route-targets) INTO the primitive knob section as the ROUTE knob opening up - kill it as a separate section. Live/next status lives as micro-badges on the knobs themselves.



## Summary of Changes

Per ADR-0014. (1) FOLDED ROUTE Targets into the primitive: deleted the standalone #route-targets card grid (the ROUTE column in the WHEN/PULL/ROUTE knob diagram already lists every destination with live/next dots, so nothing lost). Removed the dead routeTargets array + orphaned icon imports (Wallet/ArrowRightLeft/Landmark/Droplets). (2) KILLED the two-tier split: Use Cases is now ONE ascending grid - useCases (live) + composableUseCases (next) combined, each card carrying a per-card ● LIVE / NEXT badge; removed the "LIVE TODAY" / "WHEN COMPOSABLE SHIPS" tier labels and the divider. Heading "One primitive. Today and tomorrow.", intro frames it as one If/Then ascending, not two products. (3) REFRAMED the execution toggle from rivalry to two-configs: HowComposableWorks toggle labels "PaymentPolicy/ComposablePolicy" -> "Minimal config / Full config" (policy names kept as mono subtitles for C), badge ROADMAP->NEXT, caption "Same primitive, different ROUTE." -> "Same primitive, two configs."; Home section heading "Two ways to settle." -> "Two configs.", intro reframed ("Not two products - two settings of the same If/Then"). Build clean.
