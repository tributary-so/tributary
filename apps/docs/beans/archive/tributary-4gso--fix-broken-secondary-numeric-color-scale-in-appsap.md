---
# tributary-4gso
title: Fix broken secondary-* numeric color scale in apps/app
status: completed
type: bug
priority: low
created_at: 2026-06-28T12:47:42Z
updated_at: 2026-06-29T06:03:11Z
---

Pre-existing (surfaced during yra3 grilling execution). ReferralProgramExplainer.tsx:143-147 uses `secondary-50`/`secondary-600` etc. (numeric scale) but tailwind.config.js only defines `secondary: {DEFAULT, foreground}` — no numeric scale. Classes render uncolored.

Distinct from the variant-color fixes (subscription/milestone/payasyougo top-level scales added in yra3) — those were mechanical. `secondary` is a generic semantic color; adding a numeric scale is a design decision (which hue? does it duplicate `muted`/`accent`?). Decide intent before adding.

Also audit for other mismatched class/config pairs as a one-off color-system coherence pass.

## Summary of Changes (2026-06-28)

Resolved as a DUPLICATE-ROW deletion, not a scale addition. ReferralProgramExplainer.tsx rendered 'Gateway Business Fee' TWICE consecutively: once with `secondary-50`/`secondary-700` classes (broken — no numeric scale defined) and once with `blue-50`/`blue-700` (working). Identical label + value; only color differed. Deleted the broken `secondary-*` duplicate (6 lines), kept the working `blue-*` row.

No `secondary` numeric scale added — the usage was a copy-paste duplicate, not a distinct visual tier needing its own hue. Ponytail: deletion over addition. Build passes.

Audit note: no other mismatched class/config pairs found in apps/app beyond the ones yra3 already fixed (subscription/milestone/payasyougo top-level scales).
