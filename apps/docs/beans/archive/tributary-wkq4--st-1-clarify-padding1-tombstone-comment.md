---
# tributary-wkq4
title: 'ST-1: Clarify padding1 tombstone comment'
status: completed
type: task
priority: low
created_at: 2026-07-06T15:41:47Z
updated_at: 2026-07-06T15:56:40Z
parent: tributary-u5vf
---

state/payment_gateway.rs:19 — rename padding1 to padding1_dead or add DO NOT REMOVE comment.

## Summary of Changes
Strengthened the padding1 tombstone comment in state/payment_gateway.rs:19. Kept the field name `padding1` (renaming would shift the IDL and break TypeScript clients); added DO NOT REMOVE marker explaining the slot preserves byte offsets for live account deserialization.
