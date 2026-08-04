---
# tributary-bij9
title: 'G-4: Add test for tracking.ts on-chain policy lookup'
status: completed
type: task
priority: normal
created_at: 2026-07-06T15:42:11Z
updated_at: 2026-07-06T16:47:34Z
parent: tributary-fzak
---

No test coverage for on-chain policy lookup in tracking.ts.

## Summary of Changes
Added new test file packages/payments/src/core/tracking.test.ts with 11 tests covering PaymentTracker.getPoliciesByGateway, getPoliciesByOwner, and getPaymentPoliciesForOptions. Asserts delegation to the SDK with correct PDAs / memcmp offsets / filter combination order, plus the swallowed-error empty-array path. Extended packages/payments/src/__tests__/setup.ts mock to include encodeMemo and PaymentPolicy exports. All 11 tests pass; all 265 payments tests pass.
