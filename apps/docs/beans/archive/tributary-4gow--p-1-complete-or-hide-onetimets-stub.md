---
# tributary-4gow
title: 'P-1: Complete or hide onetime.ts stub'
status: completed
type: task
priority: low
created_at: 2026-07-06T15:42:10Z
updated_at: 2026-07-06T16:47:50Z
parent: tributary-fzak
---

payments/src/core/onetime.ts — stub throws 'not yet implemented' but is exported. Hide from public exports or implement.

## Summary of Changes
Removed the dead getFromIndexer stub from packages/payments/src/core/onetime.ts (threw 'Indexer integration not yet implemented' while being exported). The method had no callers anywhere in the repo. Added a class-level comment marking OneTimePaymentTracker as PARTIAL STUB and noting that indexer integration can be re-added when it lands.
