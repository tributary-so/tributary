---
# tributary-js40
title: Add ORE program to ALLOWED_FORWARD_PROGRAMS + create-path test
status: todo
type: task
created_at: 2026-07-23T08:04:11Z
updated_at: 2026-07-23T08:04:11Z
parent: tributary-bcfo
---

programs/tributary/src/constants.rs:14: append oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv. Add a create_composable_policy test accepting the ORE forward config (offset-0 data check + pinned automation) and one rejecting a config without the discriminator check. See milestone tributary-ew9s HANDOFF §2, §5 bullet 2.
