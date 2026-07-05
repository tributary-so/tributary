---
# tributary-6869
title: 'API: merchant query endpoints + CSV exports'
status: completed
type: feature
priority: high
created_at: 2026-07-03T09:11:22Z
updated_at: 2026-07-05T08:36:27Z
parent: tributary-6egw
blocked_by:
    - tributary-nepb
---

## What

The read-side merchant surface under `/v1/gateway/:gateway/merchant/*`, all behind `requireGatewayAuth`. Derived on-the-fly from the `events` table (no materialization). All amounts in token units with the mint label — no fiat FX.

## Deliverables

### `GET /policies`
Returns regular (`tributary_PaymentPolicyCreated`) + composable (`tributary_ComposablePolicyCreated`) policies for this gateway, each enriched with:
- derived status (replay `...StatusChanged` then check `...Deleted` — see milestone's Policy status derivation),
- type-specific amount/frequency (extract from the embedded `policy_type`),
- payer (`user_payment.owner` — join via `UserPaymentCreated` or read from the policy event),
- payment count + total paid (aggregate `PaymentRecord` / `ComposableExecuted` filtered by policy),
- last payment timestamp.
Pagination via `limit`/`offset`.

### `GET /subscribers`
Distinct wallets (`payer` from `PaymentRecord`, `owner` from `UserPaymentCreated`/policy events) under this gateway, with: # policies, total paid (all variants), last active timestamp. `GROUP BY` on the JSONB. Paginated.

### `GET /revenue`
```json
{
  "mrr": <u64 sum of monthly-normalized Subscription.amounts over on-chain-active subs>,
  "recognizedRevenue": <Σ PaymentRecord.amount in period>,
  "activeSubscriptionCount": <int>,
  "period": { "start": iso, "end": iso },
  "series": [ { "ts": iso, "mrr": n, "recognized": n }, ... ]   // daily buckets
}
`default period = last 30 days; override via ?start&end&bucket=day|week`
```
**MRR excludes PayAsYouGo/Milestone/OneTime/UpTo.** Active = not deleted, not terminal/paused (per status derivation). Series MRR per bucket = active-at-bucket-end (historical replay of status events up to each bucket boundary).

### `GET /export/{policies|subscribers|revenue|payments}?format=csv`
`text/csv` serialization of the corresponding query. `payments` reuses the existing `getPaymentRecords` query. Streaming response for large dumps.

## Acceptance

- [ ] All four endpoints return 403 without a valid gateway-matching JWT.
- [ ] `/policies` correctly derives `Deleted` / paused / `Active` by replaying status events.
- [ ] `/policies` payment-count + total-paid match a manual count of `PaymentRecord` for that policy.
- [ ] `/subscribers` is a correct distinct-wallet aggregate (cross-check against `/policies` totals).
- [ ] `/revenue.mrr` excludes non-Subscription variants; equals Σ monthly-normalized active subs; matches a hand-computed sample.
- [ ] `/revenue.series` MRR-at-bucket reflects status changes within the window (e.g. a policy deleted mid-month stops contributing from that bucket).
- [ ] CSV exports have a header row, escape commas/quotes/newlines, and stream.
- [ ] Cross-gateway isolation: a JWT for gateway A cannot read gateway B's data (403).
- [ ] OpenAPI annotations for all endpoints.

## Files

- new: `apps/api/src/routes/gateway-merchant.ts` (router; mounts under `/v1/gateway/:gateway/merchant`)
- extend: `apps/api/src/db/queries.ts` — add the aggregation queries (status-replay, subscriber GROUP BY, MRR series). Keep them gateway-scoped and parameterized.
- wire `requireGatewayAuth` on the router.

## Notes

- On-the-fly is a deliberate v1 ceiling (see milestone). Queries must be gateway-scoped at the SQL level (index on `data->>'gateway'` is already implied by existing patterns; confirm with EXPLAIN if slow).
- MRR monthly-normalization: Monthly=×1, BiWeekly=×2/2.17..., Weekly=×4.33, Daily=×30.4, etc. — encode the same frequency→monthly factor map used by the SDK's `getPaymentFrequency`. Single source of truth: import from `@tributary-so/sdk` if available, else duplicate with a `ponytail:` comment naming the SDK as the canonical source.

## Implementation notes

- Single merchant module: apps/api/src/db/merchant.ts
- Status derived by replaying Created → StatusChanged → Deleted events
- Policy PDA derived deterministically from (user_payment, policy_id) — no join needed
- MRR: Σ active Subscription.amount normalized monthly; PayAsYouGo/Milestone/OneTime/UpTo excluded
- Series: daily/weekly buckets, MRR is current snapshot per bucket (historical MRR is v2)
- CSV: minimal in-place serializer, no dep added

## Summary of Changes

- apps/api/src/db/merchant.ts — listPolicies, listSubscribers, getMerchantRevenue, listGatewayPayments
- apps/api/src/routes/gateway.ts — all merchant endpoints + CSV serializers
- apps/api/src/__tests__/gateway.merchant.route.test.ts — 14 tests covering auth + merchant routes
- Reuses PolicyRecord/PolicyCreated/StatusChanged/Deleted event queries
- PDA derived deterministically from (user_payment, policy_id)
- ADR-0026 drafted
