---
# tributary-wrob
title: Replace events.ts hand-written types with SDK imports
status: todo
type: task
created_at: 2026-07-16T10:23:50Z
updated_at: 2026-07-16T10:23:50Z
parent: tributary-oepl
---

In apps/api/src/db/events.ts: import event types from @tributary-so/sdk (PaymentRecordEvent, ComposableExecutedEvent, ComposablePolicyCreatedEvent, etc.) instead of hand-writing interfaces. Add composable event names to TributaryEventName union: tributary_composable_executed, tributary_composable_policy_created, tributary_composable_policy_deleted, tributary_composable_policy_status_changed. Add them to TributaryEventDataMap. Keep helper functions (bytesToString, parsePaymentFrequency, etc.) - those are decode utilities, not types.
