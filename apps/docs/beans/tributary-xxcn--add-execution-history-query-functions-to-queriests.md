---
# tributary-xxcn
title: Add execution-history query functions to queries.ts
status: todo
type: task
created_at: 2026-07-16T10:23:50Z
updated_at: 2026-07-16T10:23:50Z
parent: tributary-vl73
---

In apps/api/src/db/queries.ts: add getComposableExecutionsByPolicyAddress(address, options?) which queries events WHERE event_name = tributary_ComposableExecuted AND data->>composable_policy = address. Also add getPaymentExecutionsByPolicyAddress(address, options?) which queries events WHERE event_name = tributary_PaymentRecord AND data->>payment_policy = address. Both ORDER BY timestamp DESC with limit/offset defaults (100/0).
