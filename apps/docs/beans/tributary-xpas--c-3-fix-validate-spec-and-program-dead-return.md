---
# tributary-xpas
title: 'C-3: Fix validate_spec_and_program dead return'
status: completed
type: task
priority: normal
created_at: 2026-07-06T15:41:47Z
updated_at: 2026-07-06T15:56:22Z
parent: tributary-u5vf
---

create_composable_policy.rs:171-180 — change Result<Pubkey> to Result<()> since caller discards the value.

## Summary of Changes
Changed validate_spec_and_program signature in create_composable_policy.rs:272 from Result<Pubkey> to Result<()>. The caller never used the returned program_id (it is already stored on the spec). Updated both call sites and all match arms.
