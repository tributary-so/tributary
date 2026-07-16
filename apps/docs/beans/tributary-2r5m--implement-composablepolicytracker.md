---
# tributary-2r5m
title: Implement ComposablePolicyTracker
status: todo
type: task
created_at: 2026-07-16T10:23:11Z
updated_at: 2026-07-16T10:23:11Z
parent: tributary-3mho
---

In `packages/payments/src/core/tracking.ts` (or new `composable-tracking.ts`): add class ComposablePolicyTracker with getComposablePoliciesForOptions(options: PolicyLookupOptions) that delegates to sdk.getComposablePolicies(filters). Normalization: totalInput/totalOutput BN→number, decodeMemo (32-byte), strip padding/bump, carry policyAccount. Export a ComposablePolicyDetails type. Reuse PolicyLookupOptions (shared).
