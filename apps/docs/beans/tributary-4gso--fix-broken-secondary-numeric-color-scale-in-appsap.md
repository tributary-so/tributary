---
# tributary-4gso
title: Fix broken secondary-* numeric color scale in apps/app
status: todo
type: bug
priority: low
created_at: 2026-06-28T12:47:42Z
updated_at: 2026-06-28T12:47:42Z
---

Pre-existing (surfaced during yra3 grilling execution). ReferralProgramExplainer.tsx:143-147 uses `secondary-50`/`secondary-600` etc. (numeric scale) but tailwind.config.js only defines `secondary: {DEFAULT, foreground}` — no numeric scale. Classes render uncolored.

Distinct from the variant-color fixes (subscription/milestone/payasyougo top-level scales added in yra3) — those were mechanical. `secondary` is a generic semantic color; adding a numeric scale is a design decision (which hue? does it duplicate `muted`/`accent`?). Decide intent before adding.

Also audit for other mismatched class/config pairs as a one-off color-system coherence pass.
