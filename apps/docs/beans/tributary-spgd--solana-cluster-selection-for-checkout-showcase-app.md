---
# tributary-spgd
title: Solana cluster selection for checkout + showcase apps
status: todo
type: epic
priority: high
created_at: 2026-06-29T12:48:29Z
updated_at: 2026-06-29T12:48:29Z
---

## Goal

All customer-facing apps (`apps/app`, `checkout`, `showcase-payments`, `showcase-payment-policies`, `showcase-topup-sol`) use the same Solana cluster selection system with identical env-var configuration and zero hardcoded RPC endpoints.

## Decisions (locked via grilling)

1. **Copy-paste, not extract.** Cluster plumbing stays in-app; `packages/sdk-react` stays Tributary-focused.
2. **Copy verbatim.** jotai + `@heroui/react` come along — identical code across all apps.
3. **Drop surfpool.** Standardize on two env vars only: `VITE_SOLANA_API` + `VITE_SOLANA_API_DEVNET`. `showcase-topup-sol` loses its surfpool cluster.
4. **Fail at build time.** `vite.config.ts` validates required env vars via `loadEnv` — `vite build` fails if missing. No runtime guards, no hardcoded fallbacks.

## Env var spec (canonical)

```
VITE_SOLANA_API_DEVNET=
VITE_SOLANA_API=
```

## Child tasks

- apps/app — build-time env validation only (reference leads by example)
- apps/checkout — full cluster system (new)
- apps/showcase-payments — full cluster system (new)
- apps/showcase-topup-sol — strip surfpool + hardcoded fallbacks
- apps/showcase-payment-policies — build-time env validation only
