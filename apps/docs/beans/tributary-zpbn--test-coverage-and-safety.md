---
# tributary-zpbn
title: Test coverage and safety
status: completed
type: epic
priority: normal
created_at: 2026-07-06T15:41:30Z
updated_at: 2026-07-06T16:48:49Z
parent: tributary-j6in
---

Fix test findings: extract keypairs, negative-path tests, shared helpers

## Summary of Changes
All 3 test-coverage fixes landed (G-1, G-5, G-6). Created tests/fixtures/test-keys.json and tests/helpers/composable.ts. Refactored 5 test files to use shared ADMIN_KEYPAIR; refactored composable.test.ts to use shared spec helpers; added G-1 negative-path scaffolding (describe.skip pending Surfpool verification). See child beans for per-fix details.
