---
# tributary-osli
title: 'Program: reduce MAX_PINNED_FORWARD_ACCOUNTS + MAX_VALIDATION_DATA_SIZE (programs/tributary/)'
status: completed
type: feature
priority: normal
created_at: 2026-07-12T19:11:40Z
updated_at: 2026-07-13T06:10:17Z
parent: tributary-u8n4
---

Parent tributary-u8n4. All on-chain Rust edits for both reductions + their unit tests. The forward-pin edit is blocked by both BLOCKER tasks (tributary-ahfg DLMM feasibility, tributary-d1qw migration posture); the validation-data edit is non-breaking and can land independently.
