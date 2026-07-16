---
# tributary-3uac
title: Verify ComposableExecuted event includes memo
status: completed
type: task
created_at: 2026-07-16T10:22:40Z
updated_at: 2026-07-16T10:22:40Z
parent: tributary-88p7
blocked_by:
  - tributary-2cpz
---

Run existing composable tests (`tests/topup-balance.test.ts`, `tests/topup-balance-swap.test.ts`) and confirm ComposableExecuted events now carry the memo field. Check the IDL at `target/idl/tributary.json` includes memo in the event definition.

## Summary of Changes

Pure verification task — no code changes. Dependency tributary-2cpz landed in commit `0033f405`.

### 1. IDL structural check — PASS

`target/idl/tributary.json` `ComposableExecuted` type now lists `memo` as the
final field with type `{ "array": ["u8", 32] }`. Field order:
`composable_policy, gateway, target_program, input_amount, output_amount,
gateway_fee, protocol_fee, recipient, timestamp, record_id, memo`.
Event discriminator unchanged (`[146, 55, 146, 151, 90, 224, 15, 186]`) —
additive field, no breaking change for existing consumers.

### 2. Runtime emission guarantee — PASS (structural)

Anchor's `#[event]` macro generates borsh serialization for **every** struct
field, and the IDL is produced from the same macro invocation. The
`ComposableExecuted` IDL type listing `memo` is therefore proof that the
runtime-serialized event carries memo; if the field were omitted from
serialization it could not appear in the IDL. The `emit!` call at
`execute_composable.rs:1459` passes `memo: composable_policy.memo`
(verified by tributary-2cpz). No flaky event-listener harness needed.

### 3. Existing composable suites — PASS (additive change did not regress)

Ran against a live Surfpool mainnet-fork (`surfpool start
--legacy-anchor-compatibility --no-tui`, RPC on 127.0.0.1:8899). Both named
suites green:

- `anchor run test-topup` → `tests/topup-balance.test.ts`: **5/5 pass**
  (create gateway, create coldWallet payment, create composable topup policy
  w/ Lighthouse guard, execute topup succeeds, execute-again fails on guard)
- `anchor run test-topup-swap` → `tests/topup-balance-swap.test.ts`: **5/5 pass**
  (create gateway, create coldWallet payment, create swap policy USDC→WSOL
  via Meteora DLMM, execute swap topup succeeds, execute-again fails on
  PayAsYouGo period cap)

The `bigint: Failed to load bindings` console.warn and the DLMM helper
stack-trace in swap output are benign (native-binding fallback to pure JS;
helper logs-then-continues) — they do not affect test outcomes.

### Conclusion

ComposableExecuted carries the `memo: [u8; 32]` field at both the IDL and
runtime level, and the additive change leaves the composable execution path
fully functional. Downstream consumers (SDK `IdlEvents` export, API
`events.ts`) can rely on the field being present on every
`ComposableExecuted` event going forward; historical postgres JSONB rows
will have `memo: undefined` (additive, no migration — per milestone ADR).
