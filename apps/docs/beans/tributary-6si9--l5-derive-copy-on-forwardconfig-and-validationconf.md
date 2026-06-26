---
# tributary-6si9
title: 'L5: Derive Copy on ForwardConfig and ValidationConfig (all-Copy fields)'
status: completed
type: task
priority: low
created_at: 2026-06-21T19:19:28Z
updated_at: 2026-06-21T19:20:37Z
---

Audit finding L5 (LOW, ergonomics). ForwardConfig and ValidationConfig derive Clone but not Copy despite containing only Copy types. Adding Copy removes .clone() boilerplate at consumer sites.

## Todos
- [x] Add Copy to ForwardConfig and ValidationConfig derives
- [x] Audit .clone() calls on these types and remove unnecessary ones (2 removed)
- [x] Verify cargo check passes
- [x] Stage source + bean files (NOT reports/), commit

## Summary of Changes

- Derived Copy on ForwardConfig and ValidationConfig (all fields are Copy).
- 2 unnecessary .clone() calls removed from programs/tributary/src/instructions/composable/create_composable_policy.rs (in `emit!(ComposablePolicyCreated)`).
- Verified with cargo check (only pre-existing warnings).
- Committed.

Bean complete.
