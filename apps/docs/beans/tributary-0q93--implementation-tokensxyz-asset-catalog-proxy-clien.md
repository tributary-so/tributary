---
# tributary-0q93
title: 'Implementation: tokens.xyz asset catalog proxy + client + UI integration'
status: completed
type: epic
priority: high
created_at: 2026-07-03T10:11:42Z
updated_at: 2026-07-06T08:06:38Z
parent: tributary-fxyo
---

Implementation epic: API proxy, shared client package, showcase dropdown, app resolver.

## Summary of Changes

Implementation landed in commit efce9d0 on branch bean-tributary-fxyo:
- packages/tokens-client (NEW): client.ts, react.ts, devnetFallback.ts, types.ts, index.ts + self-check test
- apps/api: routes/assets.ts (NEW), services/tokens-proxy.ts (NEW), services/redis.ts (NEW), middleware/rateLimit.ts (ipRateLimit), routes/index.ts mount, openapi.ts tags, .env.example
- apps/showcase-payment-policies: components/token-autocomplete.tsx (NEW), slimmed lib/token-store.ts, policy-inputs.tsx swapped Select→Autocomplete + paste-mint toggle
- apps/app: lib/api.ts (NEW), slimmed lib/token-store.ts, account-page.tsx useResolveMints effect

tsc clean on all 4 consumers; no new lint errors.
