---
# tributary-ahny
title: Integration tests — composable read methods (surfpool)
status: completed
type: feature
priority: normal
created_at: 2026-07-06T16:33:25Z
updated_at: 2026-07-07T12:47:57Z
parent: tributary-3dc0
blocked_by:
    - tributary-ztg6
---

Verify composable read methods against surfpool. Create composable policies in test fixture, fetch by user_payment (offset 9) and gateway (offset 41), assert correct set returned. recipient filtering deferred. Confirm bump:u8 does not shift offsets further.



## Summary of Changes
9/9 integration tests pass against Surfpool. Tests discover existing composable policies on-chain (from composable.test.ts) and verify:
- getComposablePolicy: null for non-existent, correct data for existing
- getComposablePoliciesByUserPayment: empty for fake, correct set for known UP
- getComposablePoliciesByGateway: empty for fake, correct set for known gateway
- getAllComposablePolicies: returns array with valid fields
- Cross-check: byUserPayment and byGateway return consistent sets (offset 9 and 41 confirmed correct)
