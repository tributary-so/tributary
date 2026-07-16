---
# tributary-2r5m
title: Implement ComposablePolicyTracker
status: todo
type: task
priority: normal
created_at: 2026-07-16T10:23:11Z
updated_at: 2026-07-16T18:17:16Z
parent: tributary-3mho
blocked_by:
    - tributary-d8lf
---

In `packages/payments/src/core/tracking.ts` (or new `composable-tracking.ts`): add class ComposablePolicyTracker with getComposablePoliciesForOptions(options: PolicyLookupOptions) that delegates to sdk.getComposablePolicies(filters). Normalization: totalInput/totalOutput BN→number, decodeMemo (32-byte), strip padding/bump, carry policyAccount. Export a ComposablePolicyDetails type. Reuse PolicyLookupOptions (shared).

## Blocker (reported 2026-07-16)

Cannot implement per brief: `delegates to sdk.getComposablePolicies(filters)` — that SDK method does not exist yet. Only `getComposablePoliciesByUserPayment` and `getComposablePoliciesByGateway` are present in `packages/sdk/src/sdk.ts`.

Dependency: **tributary-d8lf** (`Implement getPaymentPolicies(filters) + getComposablePolicies(filters)`, status: todo) under epic tributary-oos2. That task must land first.

Milestone tributary-cbvp HANDOFF §5 (Definition of Done) lists the SDK combined-filter methods BEFORE `ComposablePolicyTracker implemented`, confirming the ordering. No `--blocked-by tributary-d8lf` was wired at dispatch time — dispatch gap.

Options for the human:
1. Land tributary-d8lf first (canonical path; matches brief's delegation contract).
2. Re-scope this bean to build memcmp filters inline (mirroring the existing `PaymentTracker.getPaymentPoliciesForOptions` at tracking.ts:94-135) and refactor to delegation later — diverges from the brief.

Stopped per dispatch contract: 'blocked on unmet dependencies → hordr blocked, then stop.' No code written.
