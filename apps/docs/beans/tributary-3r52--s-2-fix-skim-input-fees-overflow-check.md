---
# tributary-3r52
title: 'S-2: Fix skim_input_fees overflow check'
status: todo
type: task
priority: high
created_at: 2026-07-06T15:41:40Z
updated_at: 2026-07-06T15:41:40Z
parent: tributary-u5vf
---

Line 384-387: condition total_fee <= face_amount || checked_add short-circuits. Change to always verify: !face_amount.checked_add(total_fee).is_some() then error.
