---
# tributary-rov6
title: 'SDK-1: Fix generateUsageReport credits limit'
status: todo
type: task
priority: high
created_at: 2026-07-06T15:42:02Z
updated_at: 2026-07-06T15:42:02Z
parent: tributary-jnx8
---

metering.ts:536 — creditsLimit reads period.totalUsage instead of tracker.config.limits.credits. remainingBudget is always 0.
