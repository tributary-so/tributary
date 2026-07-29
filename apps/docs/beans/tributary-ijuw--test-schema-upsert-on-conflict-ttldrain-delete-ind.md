---
# tributary-ijuw
title: Test schema — upsert ON CONFLICT, TTL/drain delete, index usage
status: todo
type: task
created_at: 2026-07-29T19:08:06Z
updated_at: 2026-07-29T19:08:06Z
parent: tributary-ergr
blocked_by:
    - tributary-z6fr
---

assigned: tester

Verify idempotent upsert (ON CONFLICT (venue,address) DO UPDATE), drain-delete of stale rows (refreshed_at TTL / not-seen-in-N), and that the rank index is used by the search query plan.
