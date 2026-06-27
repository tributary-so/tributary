---
# tributary-i182
title: 'New ''The Primitive'' section: WHEN/PULL/ROUTE 3-knob model'
status: completed
type: task
priority: high
created_at: 2026-06-26T09:29:35Z
updated_at: 2026-06-26T10:06:17Z
parent: tributary-m08g
blocked_by:
    - tributary-breu
---

Port the WHEN/PULL/ROUTE 3-column layout (from the harvested Composable.tsx content) into a new section on Home, placed immediately after 'How It Works'. Three columns: WHEN (trigger condition), PULL (value transfer), ROUTE (destination). Each column lists capabilities and carries a status badge. Badge accuracy: PULL = ● LIVE (all 3 schedule models work today); WHEN = partial (schedule-based live, oracle/governance/balance = next); ROUTE = partial (wallet live, DEX/lending/staking/LP/any-program = next). ROUTE items MUST be vendor-neutral: 'Wallet', 'DEX swap', 'Lending deposit', 'Staking', 'Liquidity provision', 'Any whitelisted Solana program' — no Meteora/Jupiter/Raydium by name. Add a closing callout: 'PULL is live. WHEN and ROUTE extend it into a composable automation layer.' Verify: renders on Home, badges accurate, no vendor names.



## Summary of Changes

- Added `#primitive` section on Home immediately after the simple HowItWorks, porting the WHEN/PULL/ROUTE 3-column layout from the harvested Composable.tsx.
- WHEN (Trigger Condition): PARTIAL badge — Time/schedule live (filled dot), Price oracle / Wallet balance / Governance outcome / Custom logic next (muted).
- PULL (Value Transfer): ● LIVE — Fixed amount, Variable/usage-based, Percentage, Any token all live.
- ROUTE (Destination): PARTIAL — Wallet live; DEX swap, Lending deposit, Staking, Liquidity provision, Any whitelisted Solana program next.
- Closing callout: "PULL is live — recurring payments on mainnet today. WHEN and ROUTE extend it into a composable automation layer."
- ROUTE items fully vendor-neutral (no Jupiter/Meteora/Raydium). Renders on Home; build clean.
