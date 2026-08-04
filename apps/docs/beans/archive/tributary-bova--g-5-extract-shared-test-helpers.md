---
# tributary-bova
title: 'G-5: Extract shared test helpers'
status: completed
type: task
priority: low
created_at: 2026-07-06T15:42:18Z
updated_at: 2026-07-06T16:48:06Z
parent: tributary-zpbn
---

DISABLED_SPEC, programCallSpec, etc. duplicated across 4 test files. Extract to tests/helpers/composable.ts.

## Summary of Changes
Created tests/helpers/composable.ts with shared composable-policy spec helpers: ADMIN_KEYPAIR loader, DISABLED_SPEC, DISABLED_INIT, programCallSpec, validationInit, defaultByteRangeChecks. Refactored tests/composable.test.ts to import these from the helper instead of defining locally. defaultForwardConfig intentionally NOT extracted — each test file uses a slightly different shape (different programId, numPinnedAccounts, caller signature), so a shared helper would be a leaky abstraction.
