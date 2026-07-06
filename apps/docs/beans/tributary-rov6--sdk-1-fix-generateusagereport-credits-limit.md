---
# tributary-rov6
title: 'SDK-1: Fix generateUsageReport credits limit'
status: completed
type: task
priority: high
created_at: 2026-07-06T15:42:02Z
updated_at: 2026-07-06T16:45:56Z
parent: tributary-jnx8
---

metering.ts:536 — creditsLimit reads period.totalUsage instead of tracker.config.limits.credits. remainingBudget is always 0.

## Summary of Changes
generateUsageReport in packages/sdk-x402/src/metering.ts:536 now reads the credits limit via the new public tracker.getLimit("credits") method (added on UsageTracker). Previously read period.totalUsage["credits"] for BOTH limit and used, so remainingBudget was always 0. Added 5 regression tests in test/metering.test.ts pinning the corrected behaviour.
