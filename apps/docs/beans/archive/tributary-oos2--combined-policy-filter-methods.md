---
# tributary-oos2
title: Combined policy filter methods
status: completed
type: feature
priority: normal
created_at: 2026-07-16T10:22:56Z
updated_at: 2026-07-16T12:48:30Z
parent: tributary-29wo
---

Add getPaymentPolicies(filters) + getComposablePolicies(filters) to SDK that accept {userPayment, gateway, recipient, trackingId} and build memcmp arrays.

## Summary of Changes

Both child tasks completed:
- tributary-d8lf: getPaymentPolicies + getComposablePolicies implemented
- tributary-wfhx: 13 tests covering all filter combinations and offsets
