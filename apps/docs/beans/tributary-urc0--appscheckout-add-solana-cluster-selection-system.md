---
# tributary-urc0
title: 'apps/checkout: add Solana cluster selection system'
status: todo
type: feature
priority: high
created_at: 2026-06-29T12:49:03Z
updated_at: 2026-06-29T12:49:39Z
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
- [ ] Add `jotai` to `apps/checkout/package.json`
- [ ] Add `@heroui/react` to `apps/checkout/package.json`
- [ ] `pnpm install`

### Cluster system (copy from app)
- [ ] Create `apps/checkout/src/components/cluster/cluster-data-access.tsx` (verbatim from app)
- [ ] Create `apps/checkout/src/components/cluster/cluster-ui.tsx` (verbatim from app)

### SolanaProvider rewrite
- [ ] Rewrite `apps/checkout/src/components/solana-provider.tsx` to use `useCluster()` instead of `config.rpcUrl` (match app's solana-provider.tsx)
- [ ] Remove hardcoded `|| "https://api.mainnet-beta.solana.com"` fallback from `constants.ts` rpcUrl field

### Wiring
- [ ] Wire `ClusterProvider` + `SolanaProvider` into `apps/checkout/src/components/app-providers.tsx` (ClusterProvider wraps SolanaProvider)
- [ ] Wire `ClusterUiSelect` into `apps/checkout/src/components/app-header.tsx` (next to WalletButton, both desktop + mobile nav)

### Config
- [ ] Create `apps/checkout/.env.example` with:
  ```
  VITE_SOLANA_API_DEVNET=
  VITE_SOLANA_API=
  ```
- [ ] Add build-time env validation to `apps/checkout/vite.config.ts` (loadEnv check for both vars)

## Checklist
- [ ] All above items done
- [ ] `vite build` fails without env, succeeds with env
- [ ] Cluster dropdown appears in header, switches between mainnet/devnet
- [ ] WalletButton still works
- [ ] `pnpm run lint`
