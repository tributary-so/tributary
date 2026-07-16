---
# tributary-wrob
title: Replace events.ts hand-written types with SDK imports
status: todo
type: task
priority: normal
created_at: 2026-07-16T10:23:50Z
updated_at: 2026-07-16T18:47:45Z
parent: tributary-oepl
blocked_by:
    - tributary-gd1l
    - tributary-ijzd
    - tributary-29wo
    - tributary-7ape
---

In apps/api/src/db/events.ts: import event types from @tributary-so/sdk (PaymentRecordEvent, ComposableExecutedEvent, ComposablePolicyCreatedEvent, etc.) instead of hand-writing interfaces. Add composable event names to TributaryEventName union: tributary_composable_executed, tributary_composable_policy_created, tributary_composable_policy_deleted, tributary_composable_policy_status_changed. Add them to TributaryEventDataMap. Keep helper functions (bytesToString, parsePaymentFrequency, etc.) - those are decode utilities, not types.

## Blocker (2026-07-16) — unmet SDK dependency

This task cannot proceed: its entire purpose is to REPLACE hand-written event interfaces in `apps/api/src/db/events.ts` with imports from `@tributary-so/sdk`, but the SDK currently exports **zero** event types.

Confirmed absent (source `packages/sdk/src/*.ts` AND built `packages/sdk/dist`):
- `PaymentRecordEvent`, `ComposableExecutedEvent`, `ComposablePolicyCreatedEvent`, `ComposablePolicyDeletedEvent`, `ComposablePolicyStatusChangedEvent` — none exported.
- `IdlEvents` is not surfaced; the SDK's `types.ts` derives accounts/types via `IdlAccounts`/`IdlTypes` but not events, and it does NOT re-export the raw `Tributary` IDL type (private type-only import from `../../../target/types/tributary.js`). So the API cannot derive `IdlEvents<Tributary>` locally without reaching into the program's build output — wrong layer.

This bean is the API *consumer* of SDK work owned by these still-`todo` sibling beans:
- `tributary-gd1l` — Export IdlEvents types from types.ts
- `tributary-ijzd` — Centralize event types in SDK types.ts
- `tributary-29wo` — SDK event type exports + combined filter methods
- `tributary-7ape` — Verify event types resolve after IDL regen

**Resolution:** land the SDK event-type exports (e.g. `export type PaymentRecordEvent = IdlEvents<Tributary>["paymentRecord"];` for each event in `packages/sdk/src/types.ts`), rebuild the SDK, then re-dispatch this bean. Once `PaymentRecordEvent` etc. resolve from `@tributary-so/sdk`, this task is mechanical: swap each hand-written `Tributary*` interface for the SDK import, then add the composable events (`tributary_composable_executed`, `tributary_composable_policy_created`, `tributary_composable_policy_deleted`, `tributary_composable_policy_status_changed`) to `TributaryEventName` + `TributaryEventDataMap`.

Note (pre-existing, orthogonal): the `TributaryEventName` union already uses *lowercase* event-name strings (e.g. `tributary_payment_record`) that do NOT match the names actually stored in postgres (`tributary_PaymentRecord`, PascalCase — see `kafkaConsumer.ts` topic + all live queries in `db/queries.ts`/`db/merchant.ts`). This casing mismatch affects all 12 existing entries and is out of scope here, but should be reconciled in a separate bean.

Refusing to ship half-finished work: hand-writing the interfaces (the anti-goal of this bean) or expanding into the SDK (scope the 4 sibling beans own) are both off-limits per the brief.
