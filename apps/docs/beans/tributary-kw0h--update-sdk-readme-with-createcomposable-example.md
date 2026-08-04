---
# tributary-kw0h
title: Update SDK README with createComposable() example
status: completed
type: task
priority: high
created_at: 2026-07-13T11:12:29Z
updated_at: 2026-08-04T20:06:46Z
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

## Summary of Changes

packages/sdk/README.md composable example fixed: expanded placeholder /* forwardConfig */ to full disabled-ForwardConfig literal, expanded /* ... */ payAsYouGo to full struct, added Transaction import, fixed createComposable arg misalignment (added postValidation params), pinnedAccounts 2-entry fixed-size array. Example now compiles against current SDK.
