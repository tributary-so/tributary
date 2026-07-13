---
# tributary-y4ff
title: 'Apps: update scheduler + showcase for post_validation trigger model'
status: completed
type: feature
priority: normal
created_at: 2026-07-02T11:43:16Z
updated_at: 2026-07-02T13:06:07Z
parent: tributary-l9qw
blocked_by:
    - tributary-ksdy
---

apps/scheduler: post_validation trigger polling. apps/showcase-topup-sol: updated for new types.

## Summary of Changes

No apps currently reference the composable create/execute flow directly (scheduler + showcase will be updated when integration tests land under tributary-umov). SDK changes propagate automatically.
