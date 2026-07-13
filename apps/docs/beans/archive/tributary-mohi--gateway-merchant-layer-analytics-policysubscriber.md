---
# tributary-mohi
title: Gateway Merchant Layer — analytics, policy/subscriber views, CSV exports
status: completed
type: milestone
priority: high
created_at: 2026-07-03T09:09:15Z
updated_at: 2026-07-05T08:40:48Z
---

## Goal

Turn the gateway management experience into a lightweight merchant view: a gateway operator can see their **policies**, **subscribers** (wallets), **revenue/MRR**, and **export CSV** — all scoped to their gateway, all derived from the on-chain events already stored in Postgres.

## Scope verdict (from grilling — locked)

- **Positioning:** Incremental feature inside `apps/app` + `apps/api`. NOT a hosted SaaS, NOT a new standalone app, NOT multi-tenant platform infra. The protocol repo stays clean.
- **No new contract work.** Zero Rust/program changes. No qedspec update.
- **No SDK changes required** — the app calls the API directly (`fetch`); merchant data is off-chain derived.

## Definitions (locked — these resolve the grilling forks)

- **"Plan" = "Policy".** There is no on-chain plan concept. "Subscription plan management" is realized as **PaymentPolicy / ComposablePolicy management** scoped to this gateway. Plans are NOT inferred or registered — we just list the policies that exist under the gateway and their derived state.
- **"Subscriber" = wallet only.** A subscriber is a distinct `payer`/`owner` (from `PaymentRecord` / `PaymentPolicyCreated`) under this gateway's policies. **No enriched profile** (no email, name, billing address). Identity = wallet address.
- **"MRR" = on-chain-active Subscription volume, monthly-normalized.**
  - MRR = Σ (`Subscription.amount` normalized to monthly) over policies that are **not deleted and not in a terminal/paused status** on-chain.
  - **PayAsYouGo / Milestone / OneTime / UpTo are EXCLUDED from MRR.** They are reported separately as "recognized revenue" (Σ `PaymentRecord.amount` in the period) if/when surfaced.
  - **NOT churn-adjusted.** Silent churn (delegate revoked, funds moved, payment simply stops) is invisible to the contract — there is no payment-failure event. "Active on-chain" ≠ "commercially active." This limitation is documented in the UI and ADR-0023. Churn analytics deferred to a later milestone.
- **Currency:** token units with mint label (e.g. "USDC"). **No fiat FX in v1.** Document.
- **Compute model:** on-the-fly event aggregation from the `events` table. **No materialized snapshot table.** Documented ceiling: re-aggregates per request; revisit materialization if a gateway exceeds ~1k active policies. (deferred)

## Auth model (locked)

Gateway-authority wallet-sign → JWT, reusing existing infra (`signingKeys` table, `services/jwks`, `tokens/issue`, JWKS endpoint):

1. `POST /v1/gateway/:gateway/auth/challenge` → returns a nonce + the gateway pubkey.
2. Client signs the nonce with the wallet that claims to be the gateway `authority`.
3. `POST /v1/gateway/:gateway/auth/verify` → API (a) verifies signature, (b) **fetches the on-chain `PaymentGateway` account and confirms `authority == signer`**, (c) issues a short-lived JWT (reuse `tokens/issue`) with a `gateway` claim = the gateway pubkey.
4. New `requireGatewayAuth` middleware: validates JWT via JWKS, extracts `gateway` claim, enforces `claim.gateway === req.params.gateway`. Applied to all `/merchant/*` routes.

No platform API keys. Authority is sourced from chain, not from a platform DB.

## Endpoint catalog (new namespace `/v1/gateway/:gateway/merchant/*`)

| Method | Path | Returns |
|---|---|---|
| POST | `/auth/challenge` | `{ nonce, gateway, expiresAt }` |
| POST | `/auth/verify` | `{ token, expiresIn }` (JWT) |
| GET | `/policies` | regular + composable policies under gateway: derived status, amount, frequency, payer, payment count, total paid, last payment. Paginated. |
| GET | `/subscribers` | distinct wallets under gateway: # policies, total paid, last active. Paginated. |
| GET | `/revenue` | `{ mrr, recognizedRevenue, activeSubscriptionCount, series: [{ts, mrr, recognized}] }` — series bucketed daily/weekly. |
| GET | `/export/{policies|subscribers|revenue|payments}?format=csv` | `text/csv` dump. `payments` reuses existing `events/payments` query, just CSV-formatted. |

All merchant routes require the JWT + gateway match. Public `/v1/events/*` routes stay public and unchanged.

## Policy status derivation (off-chain)

A policy's current state is derived by replaying its events in order:
- start: `PaymentPolicyCreated` (or `ComposablePolicyCreated`) → `Active`
- apply each `PaymentPolicyStatusChanged` (`ComposablePolicyStatusChanged`) in timestamp order
- if a `PaymentPolicyDeleted` (`ComposablePolicyDeleted`) exists → `Deleted`
For live truth, the endpoint MAY cross-check against the on-chain account via RPC (optional hardening; not required for v1).

## UI (apps/app gateway-manage-page)

New sections added to `GatewayManagePage`, gated behind the same `isAuthority` check:
- `<RevenueSection>` — MRR (big number, token-labeled), recognized-revenue total, active-subscription count, small sparkline of the series. Footnote: "MRR = active on-chain subscriptions only; not churn-adjusted."
- `<PoliciesSection>` — table: policy pubkey, type, status, amount, frequency, payer, payment count, total paid, last payment. "Export CSV" button.
- `<SubscribersSection>` — table: wallet, # policies, total paid, last active. "Export CSV" button.

Auth UX: "Connect wallet & sign to view merchant data" prompt → calls challenge/verify → stores JWT in memory → attaches as `Authorization: Bearer` to merchant fetches.

## Explicit non-goals (v1)

- Churn analytics (silent-churn detection — deferred).
- Invoicing / tax invoices / PDF receipts (deferred).
- Enriched subscriber profiles (email/name/billing).
- Off-chain plan registry / plan CRUD.
- Multi-tenant SaaS, hosted platform, platform API keys.
- Fiat FX / historical price feeds.
- Materialized snapshot tables / nightly jobs.

## Touches

- `apps/api` — auth routes + middleware + merchant routes + queries (extend `db/queries.ts`).
- `apps/app` — three new gateway sections + a small auth/JWT helper.
- `apps/docs/adr/0023-*.md` — new ADR.
- `apps/docs/` — merchant-layer page (what/how).

## Out-of-scope layers (per AGENTS.md template — omitted deliberately)

- program contract (no Rust changes)
- SDK (no `packages/*` changes)

## Summary of Changes

Shipped vertical slice:

**API** ()
- src/services/gateway-auth.ts — challenge/nonce + verify (on-chain authority fetch + Node-native Ed25519) + JWT issue
- src/middleware/gateway-auth.ts — requireGatewayAuth (gateway claim match)
- src/db/merchant.ts — listPolicies, listMerchantSubscribers, getMerchantRevenue, listGatewayPayments (PDA-derived, status replay, MRR monthly-normalized)
- src/routes/gateway.ts — all endpoints + CSV serializers
- src/__tests__/gateway.merchant.route.test.ts — 14 tests
- jest.config.ts — pnpm-nested jose transform exception

**App** ()
- src/components/gateway/merchant/api.ts — fetch client + JWT store + useMerchantAuth hook
- src/components/gateway/sections/{revenue,policies,subscribers}-section.tsx
- src/components/gateway/gateway-manage-page.tsx — mounts the 3 sections below the existing 4
- src/components/gateway/constants.ts — MERCHANT_API_BASE

**Docs**
- apps/docs/adr/0026-gateway-merchant-layer-off-chain-derived-analytics.md (note: bean body said ADR-0023 but that was taken; 0026 is the next free slot)
- apps/docs/docs/operate/gateway-merchant-layer.md — what/how page
- apps/docs/mkdocs.yml — added to nav
- AGENTS.md — ADR map row appended

**Ponytail cuts (deliberate)**
- Nonces: in-memory Map (single-instance ceiling; swap for redis when API scales horizontally)
- JWT: reuses JWKS signing key + existing verifyToken path; gateway claim discriminates
- On-chain authority check via raw account slice (discriminator 8 + authority 32) — no anchor dep
- Ed25519 verify via Node built-in crypto (no tweetnacl dep)
- Policy addresses derived deterministically — no SQL join against PaymentRecord
- MRR: snapshot per series bucket (historical MRR is v2)
- UI sparkline: 14 divs, no chart lib

**Deferred (v2)**
- Churn analytics (silent-churn detection)
- Materialized snapshot table (>1k policies/gateway)
- Historical MRR series
- Fiat FX
- Enriched subscriber profiles
- Live RPC cross-check for status
