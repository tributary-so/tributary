---
# tributary-c1jy
title: Crucible coverage-guided fuzz of deployed tributary.so
status: todo
type: task
priority: normal
created_at: 2026-07-01T09:28:05Z
updated_at: 2026-07-02T12:01:34Z
parent: tributary-ujni
---

Optional (bean tributary-eu41 step 5). Install Crucible, then 'qedgen probe --crucible --root programs/tributary' against the deployed .so to surface panic/unwrap/overflow crashes as findings. Coordinate with the sibling Mollusk+cargo-fuzz bean: the fuzzer's must-fail list consumes tributary.qedspec preconditions, and a fuzzer counterexample to current_period_total <= max_amount_per_period is a counterexample to the A2 formal claim and must be reconciled both sides. Crucible remains a secondary input — do not block the Mollusk fuzzer on it.
