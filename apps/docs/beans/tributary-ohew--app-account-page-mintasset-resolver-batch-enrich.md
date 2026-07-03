---
# tributary-ohew
title: 'app: account-page mint→asset resolver (batch enrich)'
status: todo
type: task
priority: high
created_at: 2026-07-03T10:13:32Z
updated_at: 2026-07-03T10:13:38Z
parent: tributary-q1ew
---

Wire `apps/app/src/components/account/account-page.tsx` to auto-resolve unknown mints via the API.

Changes:
- `src/lib/token-store.ts` — slim down: import from `@tributary-so/tokens-client`, wire atoms.
- `src/components/account/account-page.tsx` (near line 1221):
  - After wallet token accounts load, enumerate unique mints
  - Call `useResolveMints(mints[])` (shared hook, N parallel react-query calls)
  - Write resolved metadata into `tokenMetadataAtom` via effect
  - Enrich ALL wallet mints (including INITIAL_TOKENS entries) — idempotent overwrite adds logoURI
  - No localStorage persistence

Acceptance:
- [ ] Unknown wallet mints resolve to real symbol/decimals/logoURI within ~500ms of page load
- [ ] INITIAL_TOKENS entries get logoURI enriched (USDC, SOL get logos)
- [ ] Existing getTokenSymbol/getTokenPrecision readers work unchanged
- [ ] API failure leaves atom untouched (existing fallback: mint.slice(0,4)+'...')
- [ ] No render thrash (one batch resolve, one atom update)
- [ ] Add VITE_API_BASE_URL to .env.example
