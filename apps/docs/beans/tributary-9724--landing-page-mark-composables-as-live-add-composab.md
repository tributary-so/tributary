---
# tributary-9724
title: 'Landing page: mark composables as live + add composable example'
status: completed
type: feature
priority: normal
created_at: 2026-07-06T15:50:43Z
updated_at: 2026-07-06T16:06:37Z
---

Update landing page to reflect that all 3 knobs (WHEN/PULL/ROUTE) are now live. Fix outdated 'not yet' / 'NEXT' messaging. Add composable policy example. Add OneTime/UpTo visibility.

## Summary of Changes

Updated landing page to mark composables as live and improve visibility of all payment types:

### Status fixes
- **Three Knobs section**: WHEN and ROUTE both changed from PARTIAL → LIVE. Added validation assertions and DEX swap as live items.
- **HowComposableWorks badge**: Full config badge changed from NEXT → LIVE.
- **Composable use cases**: All 8 items flipped from NEXT → LIVE.
- **FAQs**: Rewrote 3 composable-related answers — no more 'not yet', 'in development', or 'tomorrow'.
- **Payment models text**: Fixed 'will compose' → 'composes'.

### New features
- **NEW badges**: OneTime and UpTo payment types now show NEW badges in the grid.
- **Composable example**: Added 'Composable in Action' section with hot-wallet topup flow (WHEN: Lighthouse balance check, PULL: delegated USDC, ROUTE: Meteora DLMM swap) + TerminalCard code snippet.
- **Footer tagline**: Updated from 'Automated recurring payments on Solana' → 'The pull-payment primitive for Solana'.

### Cleanup
- Deleted Roadmap.tsx (dead code — no return statement, not imported anywhere).

### Verification
- Landing page builds successfully (pnpm run build — ✓ built in 7.96s).
