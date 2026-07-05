# Gateway merchant layer — off-chain derived analytics

## Decision

A new namespace `/v1/gateway/:gateway/{auth,merchant}/*` exposes
gateway-scoped **off-chain derived** analytics (policies, subscribers,
MRR, CSV exports) computed on-the-fly from the existing `events` table.
No new contract work, no SDK changes, no materialized snapshot table.

### Auth model

Gateway-authority wallet-sign → JWT, reusing existing infra
(`signingKeys` table, `services/jwks`, `verifyToken` from
`middleware/auth`):

1. `POST /v1/gateway/:gateway/auth/challenge` → `{ nonce, gateway, expiresAt }`
2. Client signs the nonce with the wallet that claims to be the gateway `authority`
3. `POST /v1/gateway/:gateway/auth/verify` → API verifies signature,
   fetches the on-chain `PaymentGateway` account, confirms
   `authority == signer`, and issues a short-lived JWT (default 15min)
   carrying a `gateway` claim = the gateway pubkey.
4. `requireGatewayAuth` middleware (`apps/api/src/middleware/gateway-auth.ts`)
   validates the JWT via the existing JWKS path AND enforces
   `payload.gateway === req.params.gateway`.

No platform API keys. Authority is sourced from chain, not from a
platform DB. The same JWT audience (`tributary-checkout`) is reused;
the `gateway` claim discriminates.

### Definitions (locked from grilling)

- **Plan = Policy.** There is no on-chain plan concept. "Plan management"
  is realized as `PaymentPolicy` + `ComposablePolicy` listing scoped to
  this gateway.
- **Subscriber = wallet only.** Distinct `payer` from `PaymentRecord`
  events under this gateway. No enriched profile.
- **MRR = on-chain-active Subscription volume, monthly-normalized.**
  - `MRR = Σ (Subscription.amount normalized to monthly)` over policies
    that are **not deleted and not Paused**.
  - **PayAsYouGo / Milestone / OneTime / UpTo are EXCLUDED from MRR.**
    They surface as "recognized revenue" (`Σ PaymentRecord.amount` in
    the window).
  - **NOT churn-adjusted.** Silent churn (delegate revoked, funds moved,
    payment simply stops) is invisible to the contract — there is no
    payment-failure event. Documented in the UI footnote.
- **Currency:** token units with mint label. **No fiat FX in v1.**
- **Compute model:** on-the-fly event aggregation. **No materialized
  snapshot table.** Documented ceiling: re-aggregates per request;
  revisit materialization if a gateway exceeds ~1k active policies.

### Policy status derivation (off-chain)

```
start: PaymentPolicyCreated | ComposablePolicyCreated → Active
apply each StatusChanged in timestamp order (Active|Paused)
if a Deleted event exists → Deleted (terminal)
```

Policy addresses are derived deterministically from
`(user_payment, policy_id)` via `PublicKey.findProgramAddressSync` —
no SQL join against `PaymentRecord.payment_policy` needed for the
address itself. Payment aggregation does join on the derived address.

## Rejected alternatives

- **Hosted SaaS / multi-tenant platform / platform API keys.** Rejected:
  authority comes from chain, not from a platform DB. A platform API
  key model would duplicate the gateway authority graph and create a
  second trust root. The wallet-sign flow reuses the JWKS infrastructure
  the API already operates.

- **Materialized snapshot table for revenue / MRR.** Rejected: re-aggregation
  per request is fast enough up to ~1k policies/gateway (the documented
  ceiling). A snapshot table would require a writer, a refresh job, a
  reconciliation path, and a backfill — none of which the v1 traffic
  justifies. Materialization is a deferred milestone.

- **Inferred plan registry (off-chain plan CRUD).** Rejected: "plan" is
  just a `PaymentPolicy` under this gateway. The on-chain policy IS the
  plan; an off-chain registry would diverge from truth.

- **Enriched subscriber profiles (email / name / billing address).**
  Rejected: identity = wallet address. Adding profile fields would
  require PII storage, GDPR surface, and a write path the protocol
  does not need.

- **Fiat FX / historical price feeds.** Rejected: token units with mint
  label is the honest v1 surface. FX introduces a price-feed dependency,
  staleness semantics, and reconciliation complexity.

- **Churn analytics.** Rejected: silent churn is invisible to the
  contract (no payment-failure event). Detecting it requires off-chain
  heuristics (delegate balance polling, transfer-event watch) that are
  a separate milestone.

- **On-chain cross-check (live RPC) for policy status.** Rejected as a
  hard requirement for v1; the event replay is the trust source. The
  endpoints MAY cross-check via RPC as optional hardening later.

## Rationale

The merchant view is an _interpretation_ of state the chain already
emits. Re-deriving it from the events table means:

1. Zero contract risk — no new instructions, no migration.
2. Zero divergence — the events table is the indexer's canonical log.
3. Trivial rollback — disable the routes and the protocol is unchanged.

The auth model mirrors the protocol's own authority model: the gateway
account on chain names its `authority`, and that's the only identity
the merchant endpoints trust. A platform DB would create a second
authority graph and a second place to be wrong.

The MRR exclusion of non-recurring variants is deliberate: a PayAsYouGo
cap is not recurring revenue, and including it would inflate MRR in a
way that breaks the implicit "this is what arrives every month"
contract with the operator. Recognized revenue (all variants) is the
honest second number.

## Compute details

### Status map

```
statusMap[address] =
  deletedSet.has(address)             ? "Deleted"
  : statusMap.get(address)            // most recent StatusChanged
  ?? "Active"                         // default for newly created
```

`StatusChanged` events arrive desc-ordered (most recent first); the
first one we see for a given address wins.

### MRR normalization

| Frequency    | Months |
| ------------ | ------ |
| Daily        | 1/30   |
| Weekly       | 1/4    |
| Biweekly     | 1/2    |
| Monthly      | 1      |
| Quarterly    | 3      |
| SemiAnnually | 6      |
| Annually     | 12     |

### Series

`series[i] = { ts, mrr, recognized }` — `mrr` is the **current snapshot**
(constant across the series); `recognized` is the bucket's
`Σ PaymentRecord.amount`. Historical MRR would require replaying status
changes per bucket; deferred.

## References

- ADR-0001 — UserPayment-as-delegate (the PDA that owns the policies).
- ADR-0007 — ComposablePolicy as a separate account type (independent
  counter; composable events handled in the same merchant module).
- ADR-0022 — fixed-size PDAs (no realloc; seeds are stable; safe to
  derive addresses client-side).
- ADR-0025 — JWT payload generalized to `policies: PolicyClaim[]` (the
  JWKS infra this layer reuses).
- `apps/api/src/services/gateway-auth.ts` — challenge/verify/JWT issue.
- `apps/api/src/middleware/gateway-auth.ts` — `requireGatewayAuth`.
- `apps/api/src/db/merchant.ts` — aggregations + status derivation.
- `apps/api/src/routes/gateway.ts` — route surface + CSV serializers.
- `apps/app/src/components/gateway/merchant/api.ts` — client + JWT store.
- Milestone `tributary-mohi` — design decisions (grilled 2026-07-03).
