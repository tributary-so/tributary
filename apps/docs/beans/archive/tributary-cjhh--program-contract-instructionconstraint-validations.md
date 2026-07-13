---
# tributary-cjhh
title: 'Program contract: InstructionConstraint + ValidationSpec + post-validation flow'
status: completed
type: feature
priority: high
created_at: 2026-07-02T11:43:16Z
updated_at: 2026-07-02T12:48:47Z
parent: tributary-l9qw
---

On-chain refactoring of ComposablePolicy: InstructionConstraint struct, ValidationSpec enum (pre+post), two ValidationPDAs, remove min_output_amount, cold-relayer gate amendment, degenerate-pin guard.

## Summary of Changes

Both child tasks completed (tributary-q82g + tributary-1355). Program contract changes are on-chain, IDL regenerated, all tests green.
