# JWT payload generalized to `policies: PolicyClaim[]` (all 5 variants)

## Decision

The Tributary JWT issued by `/v1/tokens/issue` moves from a subscription-
only `subscriptions: SubscriptionClaim[]` field to a single discriminated
**`policies: PolicyClaim[]`** carrying any of the 5 `PolicyType` variants:

```
TributaryJWTPayload {
  ...
  policies: PolicyClaim[];        // was: subscriptions: SubscriptionClaim[]
  lastPayments: PaymentRecord[];  // unchanged
}
```

`PolicyClaim` is a `variant`-discriminated union
(`packages/payments/src/core/verification.ts`) mirroring the on-chain
`PolicyType`. Each variant carries its own status vocabulary and
variant-specific fields:

| Variant      | status vocabulary                   | JWT exp source                       |
| ------------ | ----------------------------------- | ------------------------------------ |
| Subscription | `paid` / `overdue` / `completed`    | `nextPaymentDue + buffer`            |
| Milestone    | `active` / `completed`              | latest `milestoneTimestamp + buffer` |
| PayAsYouGo   | `active` / `exhausted`              | `periodResetsAt + buffer`            |
| OneTime      | `pending` / `completed` / `expired` | `expiryDate + buffer` (else default) |
| UpTo         | `pending` / `settled` / `expired`   | `deadline` (hard, no buffer)         |

The JWT is now an **attestation of policy state** (authorization proof) AND
a carrier for recent `PaymentRecord[]` entries (payment proof). Consumers
decide which aspect to require — an installed-but-unexecuted PayAsYouGo or
UpTo yields a valid claim with an empty `lastPayments[]`. The
`verifyPolicy()` API on `TributaryVerifier` checks authorization;
`verifyPayment()` checks payment proof; they are independent.

When no variant-specific time field is present (e.g. PayAsYouGo just
installed, OneTime with `expiry_date = None`), the JWT falls back to
`JWT_DEFAULT_LIFETIME_SECONDS` (default 1h, configurable), always capped
by `JWT_MAX_TTL_DAYS`.

The filter at the old `apps/api/src/services/token-issuer.ts:96`
(`if (!("subscription" in p.policyType)) return false;`) is **removed**;
all 5 variants are eligible. `getSubscriptionDetails()` in
`apps/api/src/services/subscription.ts` extends its padding-strip branches
to include `oneTime` and `upTo` (previously they fell through, leaving
`policyType` undefined and silently dropping those policies).

The legacy `subscriptions: SubscriptionClaim[]` field is **removed** from
the payload — this is a hard break for consumers. The verifier
(`TributaryVerifier.verifySubscription`) and the
`showcase-payments/PaymentDetails` component accept either field during
the rollout window; new tokens carry `policies` only.

## Rejected alternatives

- **Keep `subscriptions` and add a parallel `policies` field.** Rejected:
  two arrays invite divergence (which one is authoritative when they
  disagree?). One discriminated array is the minimum that expresses the
  model.

- **Per-variant endpoint (`/v1/tokens/issue/subscription`,
  `/issue/milestone`, …).** Rejected: the merchant's eligibility check is
  the same regardless of variant — "does this wallet have an active
  policy for this recipient?" — and the merchant already knows which
  variant they require. Splitting endpoints multiplies routes without
  adding capability. `verifyPolicy({ variant: "..." })` is the filter.

- **Require `lastPayments.length > 0` for the JWT to issue.** Rejected:
  PayAsYouGo and UpTo can be installed and not yet executed; the
  merchant may want to grant access on authorization alone. The bean
  confirms the subscription path already does NOT enforce
  `paymentCount > 0`, so extending the lenient model is consistent.

- **Compute exp from a single global rule (e.g. always `now + 1h`).**
  Rejected: a subscription's `nextPaymentDue` is the natural re-check
  boundary; an UpTo's `deadline` is a hard wall that the token must
  outlive; a never-expiring OneTime has no time-derived signal at all.
  Per-variant exp matches the on-chain semantics; the default lifetime
  covers the no-signal case.

- **Remove the standalone `transfer` instruction (ADR-0004) now that the
  OneTime policy exists.** Rejected: outstanding direct-transfer flows
  (`mode: "payment"` checkout, ADR-0004) still serve the "instant
  payment / no policy" use case. The OneTime PolicyType (ADR-0019) is a
  scheduled, pausable, full-gateway-lifecycle single-shot authorization.
  They coexist; ADR-0004 is not amended.

## Rationale

The subscription-only JWT payload was an artificial ceiling: the program,
the SDK, the ADRs, and the `payments` package already treat all 5
variants as first-class. The verifier's `PolicyClaim` union (added in
`tributary-pzp2`-foundational) was unused by the issuer. This ADR closes
that loop — the issuer produces what the verifier consumes, for every
variant.

The per-variant status vocabulary is the minimum that lets a merchant
make an authorization decision without re-deriving on-chain state:
"paid vs overdue" (subscription), "active vs exhausted" (PayAsYouGo),
"pending vs settled vs expired" (UpTo), etc. The merchant reads
`status` first; `verifyPolicy({ status: [...] })` filters server-side.

The per-variant exp source keeps the JWT aligned with the on-chain time
fields the merchant already trusts. Capping at `JWT_MAX_TTL_DAYS` is the
existing safety rail; the new `JWT_DEFAULT_LIFETIME_SECONDS` (1h target)
covers the authorization-only case where no time field exists.

## References

- ADR-0004 — standalone `transfer` instruction (the "direct payment" path
  that coexists with the OneTime PolicyType).
- ADR-0019 — OneTime PaymentPolicy variant.
- ADR-0020 — UpTo scheme / `upTo` variant (x402 `upto`).
- ADR-0023 — payments session encoding v2 (all PolicyType variants).
- `packages/payments/src/core/verification.ts` — `PolicyClaim` union,
  `TributaryVerifier.verifyPolicy`.
- `apps/api/src/services/token-issuer.ts` — generalized claim + exp
  builders.
- Milestone `tributary-pzp2` — design decisions (grilled 2026-07-03).
