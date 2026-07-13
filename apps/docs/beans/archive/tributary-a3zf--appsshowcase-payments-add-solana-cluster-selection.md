---
# tributary-a3zf
title: 'apps/showcase-payments: add Solana cluster selection system'
status: completed
type: feature
priority: high
created_at: 2026-06-29T12:49:03Z
updated_at: 2026-06-29T20:17:02Z
parent: tributary-spgd
blocked_by:
    - tributary-20n1
---

## What

Add the full cluster selection system to `apps/showcase-payments`. Currently has NO cluster concept — `WalletProviders.tsx` reads `import.meta.env.VITE_SOLANA_API ?? clusterApiUrl('devnet')` with a hardcoded fallback.

## Source to copy from

Copy verbatim from `apps/app/src/components/`:
- `cluster/cluster-data-access.tsx`
- `cluster/cluster-ui.tsx`
- `solana/solana-provider.tsx`

## Changes

### Dependencies
- [x] Add jotai + @heroui/react + @tanstack/react-query + @solana/wallet-adapter-phantom + @solana/wallet-adapter-solflare to package.json
- [x] (covered above)
- [x] pnpm install

### Cluster system (copy from app)
- [x] cluster-data-access.tsx verbatim from app
- [x] cluster-ui.tsx verbatim from app
- [x] solana-provider.tsx verbatim from app

### Replace WalletProviders
- [x] main.tsx rewritten to use ClusterProvider + SolanaProvider (WalletProviders.tsx is dead code; removed its clusterApiUrl fallback)
- [x] Removed clusterApiUrl('devnet') fallback from main.tsx, ReactButtons.tsx, WalletProviders.tsx

### Wiring
- [x] Wired ClusterProvider + SolanaProvider into main.tsx
- [x] Wired ClusterUiSelect into Header.tsx

### Config
- [x] .env.example updated with both canonical vars
  ```
  VITE_SOLANA_API_DEVNET=
  VITE_SOLANA_API=
  ```
- [x] vite.config.ts: function form + loadEnv validation

## Checklist
- [x] All above items done
- [x] vite build fails without env (verified); succeeds with env (verified, full build green)
- [x] Cluster dropdown wired into Header
- [x] pnpm run lint: 0 errors, 3 warnings (same react-refresh warnings app has). Required eslint.config.js alignment: no-undef off, no-unused-vars off (TS handles it), react-refresh downgraded to warn, @typescript-eslint/no-unused-vars with ignoreRestSiblings — matches app's config.

## Summary of Changes

- apps/showcase-payments/package.json: added @heroui/react, jotai, @tanstack/react-query, @solana/wallet-adapter-phantom, @solana/wallet-adapter-solflare.
- apps/showcase-payments/src/components/cluster/cluster-data-access.tsx: verbatim from apps/app.
- apps/showcase-payments/src/components/cluster/cluster-ui.tsx: verbatim from apps/app.
- apps/showcase-payments/src/components/solana/solana-provider.tsx: verbatim from apps/app.
- apps/showcase-payments/src/main.tsx: rewired to ClusterProvider + SolanaProvider (drops inline providers + clusterApiUrl fallback).
- apps/showcase-payments/src/pages/ReactButtons.tsx: removed clusterApiUrl fallback.
- apps/showcase-payments/src/components/WalletProviders.tsx: removed clusterApiUrl fallback (file is dead code, left in place).
- apps/showcase-payments/src/components/Header.tsx: wired ClusterUiSelect.
- apps/showcase-payments/.env.example: added canonical 2 RPC vars.
- apps/showcase-payments/vite.config.ts: function form + loadEnv validation.
- apps/showcase-payments/eslint.config.js: aligned rules with apps/app (no-undef off, no-unused-vars off, react-refresh warn, @typescript-eslint/no-unused-vars with ignoreRestSiblings) so verbatim app files pass lint.
