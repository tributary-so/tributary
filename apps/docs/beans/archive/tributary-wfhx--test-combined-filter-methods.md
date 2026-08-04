---
# tributary-wfhx
title: Test combined filter methods
status: completed
type: task
priority: normal
created_at: 2026-07-16T10:22:56Z
updated_at: 2026-07-16T12:47:29Z
parent: tributary-oos2
blocked_by:
    - tributary-d8lf
---

Add unit tests for getPaymentPolicies + getComposablePolicies: empty filters (all), single filter, multi-filter combination, trackingId memo filter. Verify against Surfpool/local validator.

## Summary of Changes

Added `packages/sdk/src/__tests__/combined-filters.test.ts` with 13 tests covering:
- Empty filters (returns all)
- Single filter for each field (userPayment, recipient, gateway, trackingId)
- Multi-filter combinations
- Offset divergence between families (PaymentPolicy user_payment=8 vs ComposablePolicy=9)

Uses Node's built-in test runner (`node:test`) via `tsx --test` — no new dependencies.
Updated `packages/sdk/package.json` test script from `exit 0` to run the test suite.

PaymentPolicy offsets verified: user_payment=8, recipient=40, gateway=72, memo=234
ComposablePolicy offsets verified: user_payment=9, gateway=41, memo=506, recipient=538

All 13 tests pass.
