---
# tributary-exvl
title: 'apps/showcase-topup-sol: strip surfpool + hardcoded fallbacks'
status: todo
type: task
priority: high
created_at: 2026-06-29T12:49:27Z
updated_at: 2026-06-29T12:49:27Z
parent: tributary-spgd
---

## What

Rewrite `apps/showcase-topup-sol/src/components/cluster/cluster-data-access.tsx` to align with the canonical `apps/app` 2-cluster version. Currently it has diverged: a third `surfpool` cluster, `VITE_SOLANA_API_SURFPOOL` env var, and hardcoded fallback URLs (`https://api.mainnet-beta.solana.com`, `https://api.devnet.solana.com`, `http://localhost:8000`).

## Decisions

- **Drop surfpool entirely** (locked via grilling). Tests that need surfpool will configure it via `VITE_SOLANA_API_DEVNET` pointing at the surfpool URL.
- **No hardcoded RPC endpoints** anywhere.

## Changes

- [ ] Rewrite `cluster-data-access.tsx` to match `apps/app` exactly: 2 clusters (mainnet + devnet), `VITE_SOLANA_API` + `VITE_SOLANA_API_DEVNET` only, no fallback defaults
- [ ] Remove `VITE_SOLANA_API_SURFPOOL` from `apps/showcase-topup-sol/.env.example`
- [ ] Ensure `apps/showcase-topup-sol/.env.example` has the canonical 2 vars
- [ ] Add build-time env validation to `apps/showcase-topup-sol/vite.config.ts`

## Checklist
- [ ] All above items done
- [ ] `vite build` fails without env, succeeds with env
- [ ] Dropdown shows only mainnet + devnet (no surfpool)
- [ ] No hardcoded URLs remain (grep for api.mainnet-beta, api.devnet, localhost:8000)
- [ ] `pnpm run lint`
