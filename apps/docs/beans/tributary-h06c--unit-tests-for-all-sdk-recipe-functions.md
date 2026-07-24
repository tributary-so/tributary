---
# tributary-h06c
title: Unit tests for all SDK recipe functions
status: todo
type: task
priority: normal
created_at: 2026-07-24T10:34:52Z
updated_at: 2026-07-24T10:34:52Z
parent: tributary-eznl
---

Unit tests in packages/sdk/src/__tests__/. Test lighthouseValidation bridge (spec/init shape), balanceCheck + site variants (correct ATA derivation, correct lighthouse assertion), composablePolicyRecipe enforcement (throw on act-mode-no-post, warn cases, allowUnsafeActMode escape), buildComposableExecutionPayload (mock connection, verify remaining_accounts order). Pure-function tests — no RPC, no surfpool.
