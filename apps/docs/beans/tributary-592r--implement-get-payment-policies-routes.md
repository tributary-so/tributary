---
# tributary-592r
title: Implement GET /payment-policies routes
status: completed
type: task
priority: normal
created_at: 2026-07-16T10:23:50Z
updated_at: 2026-07-16T11:10:00Z
parent: tributary-vysi
---

Create apps/api/src/routes/payment-policies.ts with three routes: (1) GET / uses PaymentPolicyTracker.getPaymentPoliciesForOptions with same filter validation as subscription.ts (1-3 filters, wallet+mint paired). (2) GET /:address uses program.account.paymentPolicy.fetchNullable. (3) GET /:address/executions uses getPaymentExecutionsByPolicyAddress. Register in routes/index.ts. Add OpenAPI annotations.

## Summary of Changes

- **New:** `apps/api/src/routes/payment-policies.ts` — three GET endpoints under `/api/v1/payment-policies`:
  - `GET /` — filtered list. Reuses `getSubscriptionDetails` (which wraps the tracker) so the response shape is byte-identical to `/subscriptions`, per the "mirrors /subscriptions shape" requirement. Filter validation copied from `subscription.ts`: 1–3 filters, `walletPublicKey`/`tokenMint` paired. 404 on empty.
  - `GET /:address` — single policy. Constructs a `Tributary` program instance and calls `program.account.paymentPolicy.fetchNullable(address)`, then normalizes (memo decoded, BN→number, per-variant padding stripped, `policyAccount` attached). 404 when account is absent.
  - `GET /:address/executions` — PaymentRecord history, newest first. Paginated via `limit` (default 100) / `offset` (default 0).
- **New:** `apps/api/src/__tests__/payment-policies.route.test.ts` — 14 tests covering list filter validation (mirrors the subscription test matrix), single-fetch normalization + 404, and executions pagination/defaults.
- **Edited:** `apps/api/src/routes/index.ts` — imports + mounts the new router at `/payment-policies`; `/subscriptions` left intact (comment updated to note it's the deprecated alias).
- OpenAPI annotations added to all three endpoints.

### Notes for sibling beans (parallel-swarm seams)

The bean brief names two symbols that are sibling-bean scope and had not landed when this task ran. Both have functionally-identical equivalents that exist today, so this route compiles and passes tests now; the seams are marked with `ponytail:` comments:

- `PaymentPolicyTracker` (rename in flight, bean tributary-vd06) → currently `PaymentTracker`, reached here via the existing `getSubscriptionDetails` service. When the rename lands and "all callers updated", this route rides along unchanged.
- `getPaymentExecutionsByPolicyAddress` (new query, milestone `db/queries.ts` row) → `getPaymentRecords({ paymentPolicy })` is the functionally identical query already in `queries.ts`. Swap the import if/when a dedicated alias ships.

The single-fetch normalization intentionally duplicates the per-account transform in `services/subscription.ts` (use #2). Extract a shared helper once the composable-policy service lands (use #3) — flagged inline.

### Verification

- `pnpm --filter @tributary-so/api run lint` — clean.
- `pnpm --filter @tributary-so/api build` — succeeds.
- `pnpm --filter @tributary-so/api test` — 16 suites / 222 tests pass (14 new).
- `tsc --noEmit` on the api package — zero errors in the new/edited files.
