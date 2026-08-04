---
# tributary-d4d3
title: Implement GET /composable-policies routes + service
status: completed
type: task
priority: normal
created_at: 2026-07-16T10:23:50Z
updated_at: 2026-07-16T11:50:00Z
parent: tributary-nwgr
---

Create apps/api/src/services/composable.ts with getComposablePolicyDetails(options) using ComposablePolicyTracker and normalizing response. Create apps/api/src/routes/composable-policies.ts with three routes: (1) GET / uses ComposablePolicyTracker. (2) GET /:address uses sdk.getComposablePolicy(address). (3) GET /:address/executions uses getComposableExecutionsByPolicyAddress. Register in routes/index.ts. OpenAPI annotations. Response normalization in service layer (forward_config, validation specs included).

## Summary of Changes

- **New:** `apps/api/src/services/composable.ts` — the composable normalization/read layer:
  - `ComposablePolicyDetails` type (mirrors the milestone contract: memo decoded, `totalInput`/`totalOutput`/`createdAt`/`updatedAt` BN→number, padding/bump redacted, `policyAccount` carried, `forwardConfig` + pre/post `ValidationSpec` pass through).
  - `getComposablePolicyDetails(options)` — builds memcmp filters for `user_payment` (offset 9) and `gateway` (offset 41), calls `program.account.composablePolicy.all(filters)`, then post-filters `recipient` and `trackingId` (memo) in JS, normalizes each.
  - `getComposablePolicyByAddress(address)` — delegates to the SDK's existing `getComposablePolicy` (`fetchNullable`) and normalizes.
- **New:** `apps/api/src/routes/composable-policies.ts` — three GET endpoints under `/api/v1/composable-policies` (list / single / executions), filter validation identical to `/payment-policies` and `/subscriptions` (1–3 filters, `walletPublicKey`/`tokenMint` paired). OpenAPI annotations on all three.
- **Edited:** `apps/api/src/db/queries.ts` — added `getComposableExecutionsByPolicyAddress` (mechanical mirror of `getPaymentRecords`, filtering `tributary_ComposableExecuted` + `data->>'composable_policy'`). The executions route needs it and no equivalent existed.
- **Edited:** `apps/api/src/routes/index.ts` — imports + mounts the new router at `/composable-policies`.
- **New:** `apps/api/src/__tests__/composable-policies.route.test.ts` — 14 tests covering list filter validation, single-fetch + 404, and executions pagination/defaults.

### Notes for sibling beans (parallel-swarm seams)

The brief names `ComposablePolicyTracker` (packages/payments, beans tributary-2r5m / tributary-3mho, not yet landed). The service constructs a `Tributary` program instance directly — the exact fetch the tracker will perform — so it compiles and works today. When the tracker lands, `buildComposableFilters` + the `.all(filters)` call swap to `tracker.getComposablePoliciesForOptions(options)`. Flagged inline with `ponytail:` comments.

**Recipient/trackingId filter strategy:** only `user_payment` (9) and `gateway` (41) use memcmp — those offsets are confirmed by the SDK's own `getComposablePoliciesByUserPayment` / `…ByGateway`. `recipient` (~538) and `memo` (~506) are post-filtered in JS rather than hard-coded: the payment-side tracker already carries a stale memo offset (222 vs the current struct's 234), so deep offsets in this codebase are fragile. The milestone explicitly sanctions a post-filter fallback for recipient. Perf cost only bites recipient-only / trackingId-only queries.

**`getComposableExecutionsByPolicyAddress`:** added here because the route needs it and the sibling `db/queries.ts` row (milestone `tributary-cbvp`) hadn't landed. Returns `Event[]` — no strong `TributaryComposableExecuted` type exists in `events.ts` yet (events-centralization sibling adds it). The sibling may dedupe/reconcile.

### Verification

- `pnpm --filter @tributary-so/api run lint` — clean.
- `pnpm --filter @tributary-so/api build` — succeeds.
- `pnpm --filter @tributary-so/api test` — 17 suites / 236 tests pass (14 new).
- `tsc --noEmit` on the api package — zero errors.
