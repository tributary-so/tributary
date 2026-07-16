---
# tributary-vd06
title: Rename PaymentTracker → PaymentPolicyTracker + delegate to SDK
status: todo
type: task
priority: normal
created_at: 2026-07-16T10:23:11Z
updated_at: 2026-07-16T18:21:21Z
parent: tributary-6f5k
blocked_by:
    - tributary-d8lf
---

In `packages/payments/src/core/tracking.ts`: rename class PaymentTracker → PaymentPolicyTracker. Refactor getPaymentPoliciesForOptions to delegate to sdk.getPaymentPolicies({userPayment, gateway, recipient, trackingId}) instead of building memcmp arrays directly. Keep SubscriptionStatus interface and getPoliciesByGateway/getPoliciesByOwner as thin wrappers. Update all imports across the codebase (grep for PaymentTracker).
