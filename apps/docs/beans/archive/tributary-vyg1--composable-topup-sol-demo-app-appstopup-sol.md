---
# tributary-vyg1
title: Composable Topup-SOL demo app (apps/topup-sol/)
status: completed
type: epic
priority: high
created_at: 2026-06-25T10:48:12Z
updated_at: 2026-06-25T11:28:12Z
---

Standalone Vite+React demo that lets a connected cold wallet configure and create a ComposablePolicy: PayAsYouGo USDC funding, Meteora DLMM USDC->WSOL swap, Lighthouse SOL-balance trigger, optional WSOL->SOL unwrap (NATIVE_OUTPUT). Mirrors tests/topup-balance-sol.test.ts. No execute UI, no gateway wallet. Look&feel matches apps/app (HeroUI, jotai cluster, GT Cinetype/Denim, radius:0). chainsquad-style + transitions-dev applied.



## Epic complete

All 5 subtasks shipped + committed independently:
- tributary-ccg8 (T1 scaffold) ✓
- tributary-vur0 (T2 providers/cluster/wallet/chrome) ✓
- tributary-x8k9 (T3 lib helpers) ✓
- tributary-tp1g (T4 form steps + transitions.dev) ✓
- tributary-ay5o (T5 create flow + success) ✓

Deliverable: apps/topup-sol/ — a Vite+React demo where a connected cold wallet
configures + creates a ComposablePolicy (USDC→WSOL→SOL topup via Meteora,
Lighthouse SOL-balance trigger). Matches apps/app look (HeroUI, jotai cluster,
GT Cinetype/Denim, radius:0). transitions.dev applied throughout. Surfpool is
the default cluster. No execute UI (by design).

Run: pnpm --filter @tributary-so/topup-sol dev (with Surfpool on :8000).
