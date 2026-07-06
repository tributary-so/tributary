---
# tributary-yw8h
title: 'S-1: Remove duplicate InsufficientBalance require!'
status: todo
type: task
priority: high
created_at: 2026-07-06T15:41:40Z
updated_at: 2026-07-06T15:41:40Z
parent: tributary-u5vf
---

Delete lines 1002-1005 in execute_composable.rs (second require! is an exact copy of lines 998-1001). Saves ~200 CU.
