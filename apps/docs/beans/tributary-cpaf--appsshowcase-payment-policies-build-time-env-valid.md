---
# tributary-cpaf
title: 'apps/showcase-payment-policies: build-time env validation in vite.config'
status: todo
type: task
created_at: 2026-06-29T12:49:27Z
updated_at: 2026-06-29T12:49:27Z
parent: tributary-spgd
---

## What

This app already has a verbatim copy of the cluster system from `apps/app` — no code changes needed there. Only add build-time env validation for consistency.

## Changes

- [ ] Add `loadEnv` validation to `apps/showcase-payment-policies/vite.config.ts` for `VITE_SOLANA_API` + `VITE_SOLANA_API_DEVNET`
- [ ] Verify `apps/showcase-payment-policies/.env.example` has the canonical 2 vars (no extras)

## Checklist
- [ ] `vite build` fails without env, succeeds with env
- [ ] `pnpm run lint`
