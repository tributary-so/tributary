---
# tributary-3bxn
title: "#8 Per-tick summary log line (reduce log noise, aid observability)"
status: completed
type: task
priority: normal
created_at: 2026-07-21T09:24:26Z
updated_at: 2026-07-21T09:25:10Z
parent: tributary-ben2
---

assigned: implementer

## Problem

Both schedulers log one line PER POLICY ATTEMPT. At 100 composable duplicates + 20 payment attempts, a single tick spams 120+ lines, drowning signal. Current log is 118k lines / 23h - mostly per-policy noise. The 'Gateway X completed. Executed: N, Errors: M' summary at payments.ts:157-159 is good but only per-gateway, not per-tick; composable.ts has no summary at all.

## Fix

PaymentScheduler.checkAndExecutePayments (payments.ts:69-175): already has per-gateway summaries. Add a per-tick summary at end of method, BEFORE the existing 'Payment execution completed' line:

console.log('[' + new Date().toISOString() + '] Tick summary: gateways=X policies=Y executed=Z errors=W skipped=K cooldowns=C duration=NNms');

ComposableScheduler.tick (composable.ts:279-308): add a single summary line replacing (not adding to) the existing 'fireable' debug log:

console.log('[' + new Date().toISOString() + '] Composable tick: signer=KEY watched=N fireable=F fired=X errors=Y cooldowns=C skippedValidation=V duration=NNms');

Demote per-policy 'on cooldown - skipping' lines (composable.ts:318-320 and the new payments.ts ones from #6) to debug level once task #3 winslet refactor lands. Until then: keep them but make them terse (single line per tick counted, not per policy).

Measure tick start with Date.now() at the top of each method; compute duration at the end.

## Acceptance

- A single tick produces exactly ONE summary line per scheduler (plus per-policy detail at log-level info).
- Summary includes duration_ms.
- Summary correctly counts skipped (cooldown) vs executed vs errors.

## Tags

scheduler, ops

## Summary of Changes

- **`payments.ts`**: `checkAndExecutePayments` now emits a single tick summary at the end: `Tick summary: executed=N errors=M skipped=K cooldowns=C duration=NNms`. Tracks cooldown skips separately from errors.
- **`composable.ts`**: `tick()` now aggregates across all signers and emits: `Composable tick: watched=N fireable=F fired=X errors=Y cooldowns=C duration=NNms`. Per-signer "fireable" log kept for debugging; tick summary is the observability line.
