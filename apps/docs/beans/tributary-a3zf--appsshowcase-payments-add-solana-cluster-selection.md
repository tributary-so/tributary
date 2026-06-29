---
# tributary-a3zf
title: 'apps/showcase-payments: add Solana cluster selection system'
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

Add the full cluster selection system to `apps/showcase-payments`. Currently has NO cluster concept — `WalletProviders.tsx` reads `import.meta.env.VITE_SOLANA_API ?? clusterApiUrl('devnet')` with a hardcoded fallback.

## Source to copy from

Copy verbatim from `apps/app/src/components/`:
- `cluster/cluster-data-access.tsx`
- `cluster/cluster-ui.tsx`
- `solana/solana-provider.tsx`

## Changes

### Dependencies
- [ ] Add `jotai` to `apps/showcase-payments/package.json`
- [ ] Add `@heroui/react` to `apps/showcase-payments/package.json`
- [ ] `pnpm install`

### Cluster system (copy from app)
- [ ] Create `apps/showcase-payments/src/components/cluster/cluster-data-access.tsx` (verbatim)
- [ ] Create `apps/showcase-payments/src/components/cluster/cluster-ui.tsx` (verbatim)
- [ ] Create `apps/showcase-payments/src/components/solana/solana-provider.tsx` (verbatim from app)

### Replace WalletProviders
- [ ] Replace `WalletProviders.tsx` usage with `SolanaProvider` (or rewrite WalletProviders to delegate to the new solana-provider + cluster system)
- [ ] Remove hardcoded `clusterApiUrl('devnet')` fallback

### Wiring
- [ ] Wire `ClusterProvider` + `SolanaProvider` into app root (`App.tsx` or `main.tsx`)
- [ ] Wire `ClusterUiSelect` into `apps/showcase-payments/src/components/Header.tsx`

### Config
- [ ] Update `apps/showcase-payments/.env.example` to include both vars:
  ```
  VITE_SOLANA_API_DEVNET=
  VITE_SOLANA_API=
  ```
- [ ] Add build-time env validation to `apps/showcase-payments/vite.config.ts`

## Checklist
- [ ] All above items done
- [ ] `vite build` fails without env, succeeds with env
- [ ] Cluster dropdown appears in header
- [ ] `pnpm run lint`
