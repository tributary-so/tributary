---
# tributary-cpaf
title: 'apps/showcase-payment-policies: build-time env validation in vite.config'
status: completed
type: task
priority: normal
created_at: 2026-06-29T12:49:27Z
updated_at: 2026-06-29T19:56:39Z
parent: tributary-spgd
---

## What

This app already has a verbatim copy of the cluster system from `apps/app` — no code changes needed there. Only add build-time env validation for consistency.

## Changes

- [ ] Add `loadEnv` validation to `apps/showcase-payment-policies/vite.config.ts` for `VITE_SOLANA_API` + `VITE_SOLANA_API_DEVNET`
- [ ] Verify `apps/showcase-payment-policies/.env.example` has the canonical 2 vars (no extras)

## Checklist
- [ ] `vite build` fails without env, succeeds with env
- [x] `pnpm run lint` — 0 errors, 3 pre-existing warnings

## Summary of Changes

- apps/showcase-payment-policies/vite.config.ts: function form + loadEnv validation for both RPC env vars.
- .env.example already had the canonical 2 vars.
