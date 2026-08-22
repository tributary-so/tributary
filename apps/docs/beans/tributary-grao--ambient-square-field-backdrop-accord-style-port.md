---
# tributary-grao
title: Ambient square-field backdrop (Accord-style port)
status: completed
type: task
priority: normal
created_at: 2026-08-22T00:10:22Z
updated_at: 2026-08-22T00:22:21Z
parent: tributary-7daw
---

Port Accord's frame-driven Backdrop to @tributary-so/ui as AmbientBackdrop: squares instead of dots, tuned for light backgrounds (low-alpha grid/squares, whisper of primary glow), token-driven so dark mode keeps working.

- [x] Port seededRandom PRNG to packages/ui/src/lib/prng.ts
- [x] AmbientBackdrop component (grid drift + square field + glow + vignette, self-driving rAF frame, reduced-motion freeze, optional deterministic frame prop)
- [x] Export from index.ts + storybook stories (light/dark/static frame)
- [x] Visual verification in browser + lint clean

## Summary of Changes

- `packages/ui/src/lib/prng.ts` — seededRandom PRNG (verbatim Remotion port) for deterministic node fields.
- `packages/ui/src/backdrop/ambient-backdrop.tsx` — AmbientBackdrop: Accord-style frame-driven ambient canvas with squares instead of dots. 4 layers (drifting ledger grid via background-position, 24 seeded lissajous squares with slow rotation + primary pulse, orbiting brand glow, soft vignette). Self-driving rAF frame @30fps, freezes at frame 0 under prefers-reduced-motion, optional deterministic `frame` prop, token-driven (dark mode free).
- Light-bg tuning: grid/squares at low alpha, glow 8% primary — pixel-verified 97.8% near-white canvas with 0.3% saturated pixels on the light story.
- `packages/ui/src/backdrop/ambient-backdrop.stories.tsx` — Light / StaticFrame / Dark stories.
- `packages/ui/.storybook/preview.ts` — fixed pre-existing gap: @storybook/addon-themes was registered but never wired; added withThemeByClassName decorator (toolbar toggle + story themeOverride now work; Dark story uses themeOverride).
- Verified in browser: DOM (27 layers, 24 squares 4–8px, animation advancing, pulse=primary), computed styles both palettes, pixel stats light/dark/static. Lint clean.
