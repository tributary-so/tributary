---
# tributary-6f5k
title: PaymentPolicyTracker — rename + delegate to SDK
status: completed
type: feature
priority: normal
created_at: 2026-07-16T10:23:11Z
updated_at: 2026-07-17T10:10:09Z
parent: tributary-s16v
---

Rename PaymentTracker → PaymentPolicyTracker. Refactor to delegate to SDK getPaymentPolicies(filters) instead of hand-rolling memcmp offsets. Keep response normalization (BN→number, memo decode, padding strip).
