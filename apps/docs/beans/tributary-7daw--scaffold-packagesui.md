---
# tributary-7daw
title: Scaffold packages/ui
status: completed
type: epic
priority: normal
created_at: 2026-08-21T23:28:22Z
updated_at: 2026-08-22T00:01:16Z
parent: tributary-wiv6
---

Package scaffold, tokens, primitives, chrome, solana+tributary layers, Storybook v10, ADR

## Summary of Changes
- packages/ui scaffolded: 3-tier subpath exports (root/solana/tributary + styles + styles/fonts), tsup ESM+dts, ESM-only deviation from sdk-react noted in config
- tokens.css: canonical blue palette + --marketing green, domain scales (policy/milestone/payasyougo/onetime/upto/status/*) in @theme, wallet-adapter + HeroUI overrides, Backdrop CSS
- Tailwind v4 gotcha fixed: @font-face split into fonts.css (JS-imported) because Tailwind doesn't rebase url() in inlined imports
- Storybook 10.5.10 builds (addon-essentials does NOT exist at v10 — using docs+a11y+themes); 7 story files
