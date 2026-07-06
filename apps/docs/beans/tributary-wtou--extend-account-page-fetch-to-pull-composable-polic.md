---
# tributary-wtou
title: Extend account-page fetch to pull composable policies
status: todo
type: task
priority: high
created_at: 2026-07-06T16:33:25Z
updated_at: 2026-07-06T16:33:25Z
parent: tributary-4vfp
---

Add composablePolicies to UserPaymentWithPolicies. After fetching regular policies per UserPayment, call sdk.getComposablePoliciesByUserPayment(up). Update selectedPolicy to a discriminated union type { kind: 'regular' | 'composable' }. Update count in 'My Policies' header.
