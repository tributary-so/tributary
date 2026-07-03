---
# tributary-fyn1
title: 'App: merchant UI sections (revenue, policies, subscribers) + CSV download'
status: todo
type: feature
priority: high
created_at: 2026-07-03T09:11:48Z
updated_at: 2026-07-03T09:11:48Z
parent: tributary-6egw
blocked_by:
    - tributary-6869
---

## What

Add three read-only sections to `apps/app/src/components/gateway/gateway-manage-page.tsx` (under the existing `isAuthority` gate) that consume the new `/v1/gateway/:gateway/merchant/*` endpoints. Plus a small auth helper that obtains the gateway JWT.

## Deliverables

### Auth helper (`apps/app/src/components/gateway/use-gateway-merchant-auth.ts`)
- Hook that, given the connected wallet + gateway pubkey, runs the challenge/verify flow:
  - `POST /v1/gateway/:gateway/auth/challenge` → nonce
  - asks the wallet to `signMessage` on `"Tributary gateway auth <nonce>"` (exact string MUST match feature 1)
  - `POST /v1/gateway/:gateway/auth/verify` → JWT
- Caches the JWT in memory (module-level var or context) with its expiry; re-issues transparently on 401.
- Exposes a `fetchMerchant(path, init)` wrapper that sets `Authorization: Bearer <jwt>`.

### `<RevenueSection>`
- MRR (big number, token-labeled, e.g. "1,234.56 USDC"), recognized-revenue total (period), active-subscription count.
- Small sparkline of `series.mrr` (lightweight SVG, no chart lib — ponytail).
- Footnote: "MRR = active on-chain subscriptions only; not churn-adjusted. Silent churn is invisible to the contract."
- Period selector (30d / 90d) → `?start&end&bucket`.

### `<PoliciesSection>`
- Table: policy pubkey (truncated, click→expand/copy), type badge, derived status badge, amount+frequency, payer (truncated), payment count, total paid, last payment.
- "Export CSV" button → hits `/export/policies?format=csv`, triggers browser download.
- Pagination (load more).

### `<SubscribersSection>`
- Table: wallet (truncated), # policies, total paid, last active.
- "Export CSV" button → `/export/subscribers?format=csv`.
- Pagination.

### Wiring
- Add the three sections to `GatewayManagePage` below the existing `<KeysSection>`, all wrapped so they only render when `isAuthority && gateway`.
- Show a one-time "Sign to view merchant data" prompt (calls the auth helper) before the first merchant fetch; thereafter silent refresh.

## Acceptance

- [ ] Connecting as the gateway authority and signing once renders all three sections with live data from a running `apps/api`.
- [ ] A non-authority wallet sees nothing (existing `isAuthority` gate).
- [ ] CSV download buttons produce files matching the on-screen tables.
- [ ] JWT expiry triggers a transparent re-sign (no manual re-prompt unless the wallet disconnected).
- [ ] Loading + empty states for each section.
- [ ] Lint + typecheck clean (`pnpm run lint`, `pnpm run typecheck` or the repo's equivalent for apps/app).

## Files

- new: `apps/app/src/components/gateway/use-gateway-merchant-auth.ts`
- new: `apps/app/src/components/gateway/sections/revenue-section.tsx`
- new: `apps/app/src/components/gateway/sections/policies-section.tsx`
- new: `apps/app/src/components/gateway/sections/subscribers-section.tsx`
- edit: `apps/app/src/components/gateway/gateway-manage-page.tsx` (mount the sections + the auth prompt)
- maybe: small `fetchMerchant` client in `apps/app/src/lib/client.ts` if a shared base URL helper doesn't already exist (reuse what's there — don't add a fetch lib).

## Notes

- API base URL: read from an env/var already used by the app (search for existing API calls); do not hardcode. If none exists yet, add a single `VITE_TRIBUTARY_API_URL` (or the app's established prefix) and document.
- Stylistic conventions: match existing sections (`border border-border bg-muted/30 p-4 sm:p-6`, HeroUI components where already used, lucide icons). No new UI dependency.
