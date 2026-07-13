---
# tributary-xzfo
title: 'Documentation: ADR amendments + CONTEXT/README for composable v2.1'
status: completed
type: feature
priority: normal
created_at: 2026-07-02T11:43:16Z
updated_at: 2026-07-02T13:05:55Z
parent: tributary-zvku
---

ADR-0010 (settlement semantics: min_output removed, post_validation replaces), ADR-0016 (permissionless gate: OR-logic with post_validation + route_pin), CONTEXT.md (ValidationSpec, post_validation, InstructionConstraint vocabulary), README/AGENTS.md (ForwardConfig/ValidationConfig struct updates).

## Summary of Changes

- Amended ADR-0010 (removed min_output_amount rule, note post_validation generalizes it)
- Amended ADR-0016 (InstructionConstraint replaces ForwardAccountsPda, OR-gate, permissionless bit frozen)
- Created ADR-0021 (Composable v2.1 structural changes)
- Updated AGENTS.md: ForwardConfig/ValidationSpec docs, execution flow diagram, ADR map + link
