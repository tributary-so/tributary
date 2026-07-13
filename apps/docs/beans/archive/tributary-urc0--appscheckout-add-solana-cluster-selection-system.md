---
# tributary-urc0
title: 'apps/checkout: add Solana cluster selection system'
status: completed
type: feature
priority: high
created_at: 2026-06-29T12:49:03Z
updated_at: 2026-06-29T20:05:35Z
parent: tributary-spgd
blocked_by:
    - tributary-20n1
---

## What

Add the full cluster selection system to `apps/checkout`: cluster provider, cluster UI select dropdown, and env-driven RPC endpoints. checkout currently has NO cluster concept — `solana-provider.tsx` reads `config.rpcUrl` from `constants.ts` with a hardcoded fallback.

## Source to copy from

Copy verbatim from `apps/app/src/components/`:
- `cluster/cluster-data-access.tsx` (ClusterProvider, useCluster, jotai atoms, defaultClusters)
- `cluster/cluster-ui.tsx` (ClusterUiSelect, ClusterChecker, ExplorerLink)
- `solana/solana-provider.tsx` (SolanaProvider using useCluster)

## Changes

### Dependencies
- [x] Add `jotai` to `apps/checkout/package.json` (^2.14.0)
- [x] Add `@heroui/react` to `apps/checkout/package.json` (^2.8.10)
- [x] `pnpm install`

### Cluster system (copy from app)
- [x] Create `apps/checkout/src/components/cluster/cluster-data-access.tsx` (verbatim from app)
- [x] Create `apps/checkout/src/components/cluster/cluster-ui.tsx` (verbatim from app)

### SolanaProvider rewrite
- [x] Rewrite `apps/checkout/src/components/solana-provider.tsx` to use `useCluster()` instead of `config.rpcUrl` (match app's solana-provider.tsx)
- [x] Removed hardcoded fallback from constants.ts rpcUrl field

### Wiring
- [x] Wired ClusterProvider + SolanaProvider in app-providers.tsx
- [x] Wired ClusterUiSelect in app-header.tsx (desktop + mobile)

### Config
- [x] Created apps/checkout/.env.example (2 canonical vars)
  ```
  VITE_SOLANA_API_DEVNET=
  VITE_SOLANA_API=
  ```
- [x] Added build-time env validation to vite.config.ts

## Checklist
- [x] All above items done
- [x] vite build fails without env (verified); pre-existing lighthouse-sdk-legacy import error blocks full build
- [x] Cluster dropdown wired into header
- [x] WalletButton preserved
- [x] lint script pre-existing broken (no eslint.config.js); tsc clean on new files

## Summary of Changes

- apps/checkout/package.json: added @heroui/react + jotai.
- apps/checkout/src/components/cluster/cluster-data-access.tsx: verbatim from apps/app.
- apps/checkout/src/components/cluster/cluster-ui.tsx: verbatim from apps/app.
- apps/checkout/src/components/solana-provider.tsx: rewritten to use useCluster().
- apps/checkout/src/constants.ts: removed hardcoded mainnet-beta fallback from rpcUrl.
- apps/checkout/src/components/app-providers.tsx: wired ClusterProvider wrapping SolanaProvider.
- apps/checkout/src/components/app-header.tsx: wired ClusterUiSelect (desktop + mobile).
- apps/checkout/.env.example: canonical 2-var spec.
- apps/checkout/vite.config.ts: function form + loadEnv validation.
