---
# tributary-wiv6
title: '@tributary-so/ui — extract shared UI kit (tokens, chrome, domain components)'
status: completed
type: milestone
priority: normal
created_at: 2026-08-21T23:28:18Z
updated_at: 2026-08-22T00:45:09Z
---

Extract @tributary-so/ui (packages/ui) per UI-KIT-PLAN.md v2: unified token source, stack-neutral layout/primitives (Navbar, Footer, Backdrop, ThemeToggle, TerminalCard), solana infra layer, tributary domain layer, Storybook v10. Migrate all 7 frontend apps.

## Summary of Changes (2026-08-22, full extraction landed)
- packages/ui (@tributary-so/ui) scaffolded: tokens/chrome/solana/tributary subpaths, tsup ESM+dts, Storybook 10.5.10
- ALL 7 frontend apps migrated: showcase-payments, showcase-topup-sol, showcase-payment-policies, app, checkout, landing, lando
- Token unification: canonical blue 221° everywhere (landing purple 271° converged); marketing green kept as kit token; domain policy/status scales in kit @theme
- Backdrop (grid/mesh/scanlines) shipped + live on landing hero
- Dual react-router-instance hazard fixed in react-router-dom apps (checkout, lando) via resolve.dedupe + pinned matching dep
- shadcn components.json aliases point at the kit in app + payment-policies + checkout
- ADR-0034 records the boundary; per-app DoD verified: tsc+vite build, lint, browser DOM checks (tokens/fonts/chrome/dark-toggle)
