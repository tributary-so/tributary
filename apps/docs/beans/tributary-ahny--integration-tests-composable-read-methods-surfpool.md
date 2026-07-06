---
# tributary-ahny
title: Integration tests — composable read methods (surfpool)
status: todo
type: feature
priority: normal
created_at: 2026-07-06T16:33:25Z
updated_at: 2026-07-06T16:40:57Z
parent: tributary-3dc0
blocked_by:
    - tributary-ztg6
---

Verify composable read methods against surfpool. Create composable policies in test fixture, fetch by user_payment (offset 9) and gateway (offset 41), assert correct set returned. recipient filtering deferred. Confirm bump:u8 does not shift offsets further.
