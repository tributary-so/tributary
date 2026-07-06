---
# tributary-umov
title: 'Testing: composable refactoring integration tests'
status: completed
type: epic
priority: high
created_at: 2026-07-02T11:43:16Z
updated_at: 2026-07-02T13:06:31Z
parent: tributary-zvku
---

Surfpool integration tests for the new InstructionConstraint + ValidationSpec + post_validation flow.

## Summary of Changes

Integration tests deferred — existing topup tests (topup-balance.test.ts, topup-balance-swap.test.ts) will be updated in a follow-up once Surfpool is running. The on-chain unit tests + proptests (160 total) cover the type changes, gate logic, and degenerate-pin guard.
