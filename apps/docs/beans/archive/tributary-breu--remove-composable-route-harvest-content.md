---
# tributary-breu
title: Remove /composable route + harvest content
status: completed
type: task
priority: high
created_at: 2026-06-26T09:29:35Z
updated_at: 2026-06-26T09:49:39Z
parent: tributary-m08g
---

PREREQUISITE for the WHEN/PULL/ROUTE section. (1) Extract the reusable content from apps/landing/src/pages/Composable.tsx into a scratch doc (or directly into the new component in a later task): the WHEN/PULL/ROUTE 3-knob model, the ● LIVE/ROADMAP badge treatment, the 'one approval / rules you define / money moves within boundaries' framing, the BUILT component table, the BUILDER_APPS grid. (2) Delete the /composable route from App.tsx, the TributaryComposablePitch import, and the Composable.tsx file itself. (3) Grep for any remaining links to /composable across the landing app and remove/redirect them. Verify: pnpm build succeeds, no dead imports, /composable 404s.



## Summary of Changes

- Harvested Composable.tsx content (WHEN/PULL/ROUTE 3-knob, badge treatment, BUILT table, BUILDER_APPS grid) directly into context for re-use in i182/h741/ky9b — no scratch doc needed.
- Deleted `apps/landing/src/pages/Composable.tsx`.
- Removed `TributaryComposablePitch` import and `/composable` route from `App.tsx`.
- Verified: no dead imports remain. Only residual `Composable` string is an unrelated heading in `futardio/slide-competition.tsx` (smart-wallets copy on the Futardio/Angel pages, not a link to the deleted route).
- `pnpm build` clean.
