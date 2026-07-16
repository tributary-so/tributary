---
# tributary-vd06
title: Rename PaymentTracker → PaymentPolicyTracker + delegate to SDK
status: todo
type: task
created_at: 2026-07-16T10:23:11Z
updated_at: 2026-07-16T10:23:11Z
parent: tributary-6f5k
---

In `packages/payments/src/core/tracking.ts`: rename class PaymentTracker → PaymentPolicyTracker. Refactor getPaymentPoliciesForOptions to delegate to sdk.getPaymentPolicies({userPayment, gateway, recipient, trackingId}) instead of building memcmp arrays directly. Keep SubscriptionStatus interface and getPoliciesByGateway/getPoliciesByOwner as thin wrappers. Update all imports across the codebase (grep for PaymentTracker).
