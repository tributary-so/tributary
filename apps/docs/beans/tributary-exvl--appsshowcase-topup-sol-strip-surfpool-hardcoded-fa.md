---
# tributary-exvl
title: 'apps/showcase-topup-sol: strip surfpool + hardcoded fallbacks'
status: completed
type: task
priority: high
created_at: 2026-06-29T12:49:27Z
updated_at: 2026-06-29T19:59:21Z
parent: tributary-spgd
---

## What

Rewrite `apps/showcase-topup-sol/src/components/cluster/cluster-data-access.tsx` to align with the canonical `apps/app` 2-cluster version. Currently it has diverged: a third `surfpool` cluster, `VITE_SOLANA_API_SURFPOOL` env var, and hardcoded fallback URLs (`https://api.mainnet-beta.solana.com`, `https://api.devnet.solana.com`, `http://localhost:8000`).

## Decisions

- **Drop surfpool entirely** (locked via grilling). Tests that need surfpool will configure it via `VITE_SOLANA_API_DEVNET` pointing at the surfpool URL.
- **No hardcoded RPC endpoints** anywhere.

## Changes

- [x] Rewrite `cluster-data-access.tsx` to match `apps/app` exactly: 2 clusters (mainnet + devnet), `VITE_SOLANA_API` + `VITE_SOLANA_API_DEVNET` only, no fallback defaults
- [x] Remove `VITE_SOLANA_API_SURFPOOL` from `apps/showcase-topup-sol/.env.example`
- [x] Ensure `apps/showcase-topup-sol/.env.example` has the canonical 2 vars
- [x] Add build-time env validation to `apps/showcase-topup-sol/vite.config.ts`

## Checklist
- [x] All above items done
- [x] `vite build` fails without env (verified); succeeds at config-load with env (build fails on pre-existing unrelated polyfill issue)
- [x] Dropdown shows only mainnet + devnet (no surfpool) — verified via cluster-data-access.tsx == app version
- [x] No hardcoded URLs remain (grep clean)
- [x] `pnpm run lint` — 0 errors, 4 pre-existing warnings

## Summary of Changes

- apps/showcase-topup-sol/src/components/cluster/cluster-data-access.tsx: verbatim copy from apps/app (drops surfpool cluster + hardcoded fallback URLs).
- apps/showcase-topup-sol/src/components/cluster/cluster-ui.tsx: verbatim copy from apps/app.
- apps/showcase-topup-sol/.env.example: canonical 2-var spec.
- apps/showcase-topup-sol/vite.config.ts: function form + loadEnv validation for both RPC env vars.
