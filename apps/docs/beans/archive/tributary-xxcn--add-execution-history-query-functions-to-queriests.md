---
# tributary-xxcn
title: Add execution-history query functions to queries.ts
status: completed
type: task
created_at: 2026-07-16T10:23:50Z
updated_at: 2026-07-16T10:23:50Z
parent: tributary-vl73
---

In apps/api/src/db/queries.ts: add getComposableExecutionsByPolicyAddress(address, options?) which queries events WHERE event_name = tributary_ComposableExecuted AND data->>composable_policy = address. Also add getPaymentExecutionsByPolicyAddress(address, options?) which queries events WHERE event_name = tributary_PaymentRecord AND data->>payment_policy = address. Both ORDER BY timestamp DESC with limit/offset defaults (100/0).

## Summary of Changes

- `apps/api/src/db/queries.ts`: `getComposableExecutionsByPolicyAddress` already existed as a stub matching the spec — kept it and refreshed its stale "sibling bean may reconcile" comment (this bean is that sibling). Added `getPaymentExecutionsByPolicyAddress(address, options?)` typed to `TypedEvent<TributaryPaymentRecord>[]`, querying `tributary_PaymentRecord` filtered by `data->>'payment_policy'`, ORDER BY timestamp DESC, limit/offset defaults 100/0.
- `apps/api/src/routes/payment-policies.ts`: swapped the deferred ponytail placeholder (`getPaymentRecords({ paymentPolicy })`) for the dedicated `getPaymentExecutionsByPolicyAddress(address, { limit, offset })`; removed the resolved deferral comment.
- `apps/api/src/__tests__/payment-policies.route.test.ts`: updated mock + assertions to the new `(address, options)` signature.

Verified: `pnpm --filter @tributary-so/api test` (236 pass), `pnpm --filter @tributary-so/api run lint` clean, `tsc --noEmit` clean.
