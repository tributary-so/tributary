---
# tributary-kw0h
title: Update SDK README with createComposable() example
status: draft
type: task
priority: high
created_at: 2026-07-13T11:12:29Z
updated_at: 2026-07-13T11:12:29Z
parent: tributary-9825
---

**File:** `packages/sdk/README.md`

**From checklist §D:** SDK README updated with `createComposable()` example front and center.

**Requirements:**

- Add a composable policy example (create + execute) as one of the first code blocks
- Keep existing content but bump composable above v1 content or at least make it prominent
- The example must compile against current SDK (packages/sdk/src/)
- Short, focused: imports → create → execute in ~20 lines

**Current code anchors:** packages/sdk/src/instructions/composable.ts, packages/sdk/src/

**Acceptance:** README has a working composable example. A developer reading the README knows composable exists and can copy the example.
