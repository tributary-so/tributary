---
# tributary-7ape
title: Verify event types resolve after IDL regen
status: todo
type: task
created_at: 2026-07-16T10:22:56Z
updated_at: 2026-07-16T10:22:56Z
parent: tributary-ijzd
blocked_by:
    - tributary-gd1l
---

Run `cd packages/sdk && pnpm run build`. Confirm no type errors. Spot-check that ComposableExecutedEvent includes the new memo field. Run existing SDK tests.
