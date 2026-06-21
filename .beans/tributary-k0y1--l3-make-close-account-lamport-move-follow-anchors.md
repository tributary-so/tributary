---
# tributary-k0y1
title: 'L3: Make close_account lamport move follow Anchor''s robust RefCell pattern'
status: in-progress
type: task
priority: low
created_at: 2026-06-21T19:13:32Z
updated_at: 2026-06-21T19:14:31Z
---

Audit finding L3 (LOW, code quality/robustness). close_account chains an immutable Ref borrow and a mutable RefMut borrow of the same RefCell in one statement. Works today via NLL but fragile to compiler changes and inconsistent with Anchor's own close implementation. Bind the lamport values to named variables first.

## Todos
- [x] Refactor close_account in shared/account_close.rs to use named-variable bindings
- [x] Verify cargo check passes
- [ ] Stage source file + bean file (NOT reports/)
- [ ] Commit
