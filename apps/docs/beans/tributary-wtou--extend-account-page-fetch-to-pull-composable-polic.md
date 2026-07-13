---
# tributary-wtou
title: Extend account-page fetch to pull composable policies
status: scrapped
type: task
priority: high
created_at: 2026-07-06T16:33:25Z
updated_at: 2026-07-08T16:55:51Z
parent: tributary-4vfp
---

Add composablePolicies to UserPaymentWithPolicies. After fetching regular policies per UserPayment, call sdk.getComposablePoliciesByUserPayment(up). Update selectedPolicy to a discriminated union type { kind: 'regular' | 'composable' }. Update count in 'My Policies' header.

## Reasons for Scrapping

Duplicate of `tributary-8xka` (completed). Both describe extending `UserPaymentWithPolicies` with a `composablePolicies` array, fetching composables via `sdk.getComposablePoliciesByUserPayment(up)` after the regular policy fetch, switching `selectedPolicy` to the discriminated union, and updating the 'My Policies' count to include composables. The work landed in commit 45bef4b2 (account-page.tsx: `composablePolicies` at line 40, fetch + count logic at lines 1655/1676/1682/1711/1976). `tributary-8xka` is the more detailed, properly-wired bean — it subsumes this one.
