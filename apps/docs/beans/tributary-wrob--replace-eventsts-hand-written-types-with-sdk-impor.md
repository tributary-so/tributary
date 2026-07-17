---
# tributary-wrob
title: Replace events.ts hand-written types with SDK imports
status: todo
type: task
priority: normal
created_at: 2026-07-16T10:23:50Z
updated_at: 2026-07-17T07:23:21Z
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


## Blocker (2026-07-17) — SDK type representation mismatch (camelCase/BN/PublicKey vs snake_case/number/string)

The previous blocker (missing SDK exports) is **resolved**: all 4 sibling beans
(`tributary-gd1l`, `tributary-ijzd`, `tributary-29wo`, `tributary-7ape`) are
`completed`, and `packages/sdk/src/types.ts` now exports all 19 `IdlEvents`
aliases (`PaymentRecordEvent`, `ComposableExecutedEvent`, etc.).

Re-dispatched and attempted the swap. It is **not mechanical**: the SDK event
types do not match the API's data contract, so swapping them in breaks
consumers and the external webhook contract.

### Evidence (representation differences)

The SDK's `PaymentRecordEvent = IdlEvents<Tributary>["paymentRecord"]` resolves to:
```
{ paymentPolicy: PublicKey; gateway: PublicKey; amount: BN; timestamp: BN;
  memo: number[]; recordId: number; payer: PublicKey; recipient: PublicKey;
  tokenMint: PublicKey }
```

Confirmed at the source: `target/types/tributary.ts` (Anchor 0.31.0 codegen)
emits camelCase field names — e.g. `{ "name": "recordId" }` — even though the
IDL JSON (`target/idl/tributary.json`) declares `{ "name": "record_id" }`.
Anchor camelCases struct fields in its TS output and uses `BN` for u64/i64 and
the `@solana/web3.js` `PublicKey` class for pubkeys.

The hand-written `TributaryPaymentRecord` (snake_case, `number` amounts, `string`
pubkeys, optional `payer`/`recipient`, no `token_mint`) is **not drift** — it
deliberately models the API's actual data pipeline:

1. **Kafka contract** (`kafkaConsumer.ts:7-23`, hand-written `KafkaPaymentRecordEvent`):
   `data.payment_policy: string`, `data.amount: string`, `data.record_id: number`.
2. **Postgres JSONB** (every query in `db/queries.ts`): `data->>'payment_policy'`
   — snake_case, string amounts.
3. **External webhook payload** (`webhookForwarder.ts:4-8,34-38`):
   `WebhookPayload.data: TributaryPaymentRecord` is `JSON.stringify`'d and POSTed
   to merchant endpoints — `payment_policy` / `record_id` / etc. are the
   **external contract** with merchant webhook consumers.

### Breakage from the swap (measured)

With the 12 interfaces aliased to SDK types + 4 composable events added,
`tsc --noEmit` in `apps/api` produced 6 NEW errors (baseline = 2 pre-existing
unrelated):
- `kafkaConsumer.ts:124-126`: `string` not assignable to `PublicKey`; `number`
  not assignable to `BN`.
- `onetime.ts:16`: `gateway: PublicKey` not assignable to `string`.
- `onetime.ts:21,25`: `Property 'payment_policy' does not exist` (did you mean
  `paymentPolicy`?); `Property 'record_id' does not exist` (did you mean
  `recordId`?).

### Why this needs a human decision (not a guess)

Every in-scope-for-this-bean resolution is off-limits or out of scope:

- **Rewrite the API pipeline to camelCase + BN + PublicKey**: touches
  `kafkaConsumer.ts`, `db/queries.ts` (every `data->>'...'` query), `onetime.ts`,
  `webhookForwarder.ts`, and all tests — AND silently changes the field names in
  the webhook payload POSTed to merchants (`payment_policy`→`paymentPolicy`,
  `record_id`→`recordId`, + new `token_mint`). That is a breaking change to an
  external contract and a scope explosion past a single task bean.
- **Add a normalization/mapping layer** between SDK types and snake_case storage:
  over-engineering, not in this bean's scope.
- **Keep the hand-written interfaces**: rejects the bean's stated premise.

The sibling beans did their job (SDK exports event types), but those types model
Anchor's on-chain Borsh-decode representation, not the API's snake_case JSON
storage/Kafka/webhook format. The two representations are genuinely different and
the choice between them (or a mapping strategy) is an architecture decision, not
an implementer's call.

### Reproduction

1. `cd packages/sdk && pnpm run build` (SDK dist present, event types exported).
2. Swap the 12 interfaces in `apps/api/src/db/events.ts` for
   `export type TributaryPaymentRecord = PaymentRecordEvent;` etc. + add 4
   composable events to the union + map.
3. `cd apps/api && npx tsc --noEmit` → 6 new errors above.

Work tree reverted to clean HEAD; no half-finished swap left behind. Bean kept
`in-progress` (was `todo`; left the status alone since this is a second blocker,
not a start of work — happy to flip to `in-progress` if the daemon prefers).
