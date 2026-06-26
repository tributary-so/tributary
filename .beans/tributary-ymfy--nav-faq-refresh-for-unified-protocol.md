---
# tributary-ymfy
title: Nav + FAQ refresh for unified protocol
status: todo
type: task
priority: normal
created_at: 2026-06-26T09:30:49Z
updated_at: 2026-06-26T09:31:11Z
parent: tributary-m08g
---

Update apps/landing/src/components/Header.tsx navItems and the FAQ array in Home.tsx. NAV: replace 'Payment Models' with a 'Protocol' (or 'How It Works') entry that scrolls to the WHEN/PULL/ROUTE primitive section; keep 'How It Works', 'Use Cases', 'FAQ'. FAQ: remove/rewrite any UpTo-specific question; add 2-3 composable questions: 'What does composable mean?' (same PULL primitive, money routes through any DeFi program instead of just a wallet), 'Is composable live?' (no — v1 payments live on mainnet today; composable is v2, in development), 'What can money route to?' (any whitelisted Solana program — DEXes, lending, staking, LPs). Keep the existing FAQ accordion markup. Verify: nav scrolls to the right sections, FAQ renders, no UpTo question remains.
