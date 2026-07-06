---
# tributary-xpas
title: 'C-3: Fix validate_spec_and_program dead return'
status: todo
type: task
priority: normal
created_at: 2026-07-06T15:41:47Z
updated_at: 2026-07-06T15:41:47Z
parent: tributary-u5vf
---

create_composable_policy.rs:171-180 — change Result<Pubkey> to Result<()> since caller discards the value.
