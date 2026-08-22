---
# tributary-l472
title: Migrate showcase-payments
status: completed
type: task
priority: normal
created_at: 2026-08-21T23:28:33Z
updated_at: 2026-08-22T00:01:16Z
parent: tributary-82di
---

Prove package: tokens+chrome+solana layer; DoD: build+lint, no local tokens, manual verify

## Summary of Changes
- globals.css → 4-line canonical shape; fonts via JS import (Vite-hashed ttf)
- Providers/PaymentDetails/Navbar/Footer/ThemeToggle/ClusterUiSelect from @tributary-so/ui; local copies + dead index.css/App.css deleted
- Verified: build ✓ lint ✓ browser DOM check — --primary 221.2 blue live, GT Cinetype loaded, dark toggle works, checkout route renders kit PaymentDetails
- Palette converged purple→canonical blue (approved)
