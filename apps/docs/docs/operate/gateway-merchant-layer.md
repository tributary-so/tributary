# Gateway Merchant Layer

A gateway operator can see their **policies**, **subscribers**,
**revenue/MRR**, and **export CSV** — all scoped to their gateway, all
derived from the on-chain events stored in Postgres. This is an
off-chain view; the protocol itself is unchanged.

> See [ADR-0026](../adr/0026-gateway-merchant-layer-off-chain-derived-analytics.md)
> for the rationale and rejected alternatives.

## What it is

| Surface                                       | Source                                                     |
| --------------------------------------------- | ---------------------------------------------------------- |
| `/v1/gateway/:g/merchant/policies`            | All `PaymentPolicy` + `ComposablePolicy` under the gateway |
| `/v1/gateway/:g/merchant/subscribers`         | Distinct `payer` wallets from `PaymentRecord` events       |
| `/v1/gateway/:g/merchant/revenue`             | MRR + recognized revenue + daily series                    |
| `/v1/gateway/:g/merchant/export/*?format=csv` | CSV dump of any of the above                               |

All merchant routes require a JWT obtained via the auth flow below.
Public `/v1/events/*` routes are unchanged.

## Auth flow

```
┌─────────────┐   1. challenge    ┌──────────┐
│  Client     │ ───────────────▶  │ API      │
│ (wallet)    │ ◀─── nonce ────── │          │
│             │                   │          │
│  2. sign    │                   │          │
│  nonce      │                   │          │
│             │   3. verify       │          │
│             │ ───────────────▶  │          │ ──▶ RPC: getAccountInfo(gateway)
│             │                   │          │     confirm authority == signer
│             │ ◀── JWT ───────── │          │
│             │                   │          │
│  4. fetch    │   Authorization: │          │
│  merchant   │   Bearer <jwt>    │          │
│  data       │ ═══════════════▶ │          │
└─────────────┘                   └──────────┘
```

1. `POST /v1/gateway/:gateway/auth/challenge` → `{ nonce, gateway, expiresAt }`
2. Client signs the nonce with `wallet.signMessage(new TextEncoder().encode(nonce))`
3. `POST /v1/gateway/:gateway/auth/verify` with `{ signer, signature: number[64] }`
4. API verifies the signature, fetches the on-chain `PaymentGateway` account,
   confirms `authority == signer`, and issues a 15-minute JWT carrying
   `{ gateway: <pubkey> }`.
5. Attach the JWT as `Authorization: Bearer <token>` to merchant requests.

## Key concepts

### Plan = Policy

There is no on-chain "plan" concept. **A plan is a `PaymentPolicy` or
`ComposablePolicy` created under this gateway.** Listing policies IS
listing plans. The gateway operator does not register or curate plans
off-chain.

### Subscriber = wallet only

A subscriber is a distinct `payer` wallet from `PaymentRecord` events
under this gateway. Identity = wallet address. No enriched profile (no
email, name, billing address).

### MRR

```
MRR = Σ (Subscription.amount / frequency_to_months)
      over policies that are Active (not Deleted, not Paused)
```

- **PayAsYouGo / Milestone / OneTime / UpTo are EXCLUDED from MRR.**
  They surface as "recognized revenue" instead.
- **NOT churn-adjusted.** Silent churn — delegate revoked, funds moved,
  payment simply stops — is invisible to the contract. There is no
  payment-failure event. "Active on-chain" ≠ "commercially active."

### Recognized revenue

```
recognized = Σ PaymentRecord.amount in the time window (all variants)
```

### Currency

Token units with mint label (e.g. "USDC"). **No fiat FX in v1.**

## Status derivation

A policy's current state is derived by replaying its events:

```
PaymentPolicyCreated  → Active
+ each StatusChanged  → Active | Paused  (most recent wins)
+ PolicyDeleted       → Deleted  (terminal)
```

For live truth, the endpoint MAY cross-check against the on-chain
account via RPC. v1 trusts the event stream.

## Compute model & limits

Aggregations run **on-the-fly** per request from the `events` table.

- **No materialized snapshot table.** No nightly job. No reconciliation path.
- **Documented ceiling:** revisit materialization if a gateway exceeds
  ~1k active policies. Below that, the request-time aggregation is well
  within budget.

## UI

The gateway manage page (`/gateway/manage`) shows three new sections
below the existing identity / fees / referral / keys sections:

- `<RevenueSection>` — MRR (big number), recognized total, active-sub
  count, 14-day sparkline of recognized revenue. Includes the
  "Connect & sign" CTA that drives the auth flow.
- `<PoliciesSection>` — table with policy address, family, variant,
  status, amount, frequency, payment count, total paid, last payment.
  "Export CSV" button.
- `<SubscribersSection>` — table with wallet, policy count, total paid,
  last active. "Export CSV" button.

All three are gated behind `isAuthority` and the merchant JWT. Sections
stay hidden until the operator signs; signing is one click.

## What this is NOT (v1)

- Churn analytics (silent-churn detection — deferred).
- Invoicing / tax invoices / PDF receipts (deferred).
- Enriched subscriber profiles (email/name/billing).
- Off-chain plan registry / plan CRUD.
- Multi-tenant SaaS, hosted platform, platform API keys.
- Fiat FX / historical price feeds.
- Materialized snapshot tables / nightly jobs.

## References

- [ADR-0026 — Gateway merchant layer](../adr/0026-gateway-merchant-layer-off-chain-derived-analytics.md)
- `apps/api/src/services/gateway-auth.ts`
- `apps/api/src/middleware/gateway-auth.ts`
- `apps/api/src/db/merchant.ts`
- `apps/api/src/routes/gateway.ts`
- `apps/app/src/components/gateway/merchant/api.ts`
- `apps/app/src/components/gateway/sections/{revenue,policies,subscribers}-section.tsx`
