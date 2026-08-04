---
# tributary-9825
title: Create missing launch docs (P0/P1/P2)
status: completed
type: epic
priority: critical
created_at: 2026-07-13T11:08:41Z
updated_at: 2026-08-04T20:07:00Z
parent: tributary-6hl4
---

Per v2-launch/01-launch-readiness-checklist.md §D: P0 quickstarts (AI agent budget, auto-DCA, auto-topup), P1 guides (Lighthouse assertions, Forward CPI), P2 reference (full composable API), MIGRATION.md, and SDK README update. These are new docs — write from scratch against current code, targeting <10 min TTFV for P0s.

Use the receipts of the forward-builders as illustrated in tests/topup\*

## Summary of Changes

7 of 8 child tasks completed (3 quickstarts fixed for compile-breaking bugs, migration verified, SDK README example fixed, forward-cpi-guide gaps closed). 1 task scrapped (tributary-blij lighthouse-assertions guide) as redundant — existing lighthouse-facade.md covers all requirements.
