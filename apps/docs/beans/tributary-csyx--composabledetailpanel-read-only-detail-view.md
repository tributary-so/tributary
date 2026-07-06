---
# tributary-csyx
title: ComposableDetailPanel — read-only detail view
status: todo
type: task
priority: high
created_at: 2026-07-06T16:33:25Z
updated_at: 2026-07-06T16:40:57Z
parent: tributary-4vfp
---

Read-only detail panel (NO execute/pause/delete buttons). Sections:
1. Header "Composable Policy" + status badge
2. Pull params from policyType (reuse variant display: amount/frequency, milestones tracker, usage gauge)
3. Forward config: program pubkey (raw), input mint → output mint
4. Validation labels: pre/post "Enabled"/"Disabled"
5. Stats: paymentCount, **total_input** (NOT totalPaid — field is total_input/total_output in ComposablePolicy), total_output if forward enabled
6. Details: policy address, recipient, gateway, token mint, rent_payer
