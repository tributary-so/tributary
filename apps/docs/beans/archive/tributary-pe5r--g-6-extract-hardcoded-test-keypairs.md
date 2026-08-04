---
# tributary-pe5r
title: 'G-6: Extract hardcoded test keypairs'
status: completed
type: task
priority: high
created_at: 2026-07-06T15:42:18Z
updated_at: 2026-07-06T16:47:57Z
parent: tributary-zpbn
---

Hardcoded ADMIN_KEYPAIR byte arrays in composable.test.ts, up-to-policy.test.ts, topup-balance*.test.ts. Extract to env vars or tests/fixtures/test-keys.json with TEST ONLY marker.

## Summary of Changes
Extracted the duplicated ADMIN_KEYPAIR byte literal from 5 test files (tests/composable.test.ts, topup-balance.test.ts, topup-balance-swap.test.ts, topup-balance-sol.test.ts, up-to-policy.test.ts) into tests/fixtures/test-keys.json (with _comment marker 'TEST ONLY'). All 5 files now import from tests/helpers/composable.ts which loads the JSON once. Byte-for-byte identical keypair across all 5 files (verified via md5sum before refactor).
