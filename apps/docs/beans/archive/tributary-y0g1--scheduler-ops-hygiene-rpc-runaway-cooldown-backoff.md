---
# tributary-y0g1
title: Scheduler ops hygiene — RPC runaway, cooldown backoff, observability
status: completed
type: milestone
priority: critical
created_at: 2026-07-21T09:21:28Z
updated_at: 2026-07-22T11:59:24Z
---

Operational fixes for apps/scheduler sourced from a 23h production log investigation (scheduler.log, 118k lines). Two co-running schedulers (PaymentScheduler cron 5min, ComposableScheduler poll 30s + rescan 10min) were found burning ~100x baseline RPC due to a duplicate-accumulation bug in rescanAll, plus a flat-5min cooldown with no backoff, plus console.error output silently discarded.

## Context

Production log diagnosis (2026-07-20 → 2026-07-21, rpcpool mainnet endpoint):

- ComposableScheduler.fireable count grew 1/1 -> 100/100 monotonically over 16h. Root cause: rescanAll at apps/scheduler/src/composable.ts:248-252 appends instead of replaces, adding one duplicate per rescan. At 100 dups, each 30s tick fires 100 parallel copies of the same PDA, each burning ~4-6 RPC calls (resolveValidationTargets x2 + getLatestBlockhash + simulateTransaction). Tail RPC burn ~= 1000 calls/min from composable side alone.
- PaymentScheduler fires 19-20 policies every 5min, 0 succeed, 278 cycles in 23h. Has NO cooldown - retries same failing policies forever.
- Cooldown (MAX_FAILURES=3, COOLDOWN_MS=5*60_000) at composable.ts:36-37. consecutiveFailures is never reset on success (only whole-entry delete), so once struck it re-strikes every 5min after expiry. rescanAll wipes all cooldowns every 10min.
- console.error output (Error executing payment, Composable failed) goes to stderr which is NOT captured by the docker/systemd logging setup - all failure diagnostics are thrown away. Zero matches for the flag emoji or SendTransactionError in the 11MB log.

## Scope

All fixes touch apps/scheduler only. No program changes. No SDK changes. No new ADRs (these are bug fixes, not architectural decisions).

Files: apps/scheduler/src/composable.ts, apps/scheduler/src/payments.ts, apps/scheduler/src/index.ts, apps/scheduler/Dockerfile.

## Tasks

This milestone covers operational fixes 1-6 and 8 from the investigation. Fix #7 (investigate the actual on-chain failure reasons for the 19 perpetually-failing PaymentPolicies) is deferred to a follow-up bean because it requires #2 (stderr capture) to land first. The winston logging refactor is tracked separately (not under this milestone) as a larger standalone task.

## HANDOFF

Implementer reads each task body for the exact line numbers, the failure signature from scheduler.log, and the proposed fix shape. Test path: jest in tests/ is unaffected (these are scheduler-only paths); verification is by re-running the scheduler against a Surfpool instance and confirming (a) watched-count stays flat across rescans, (b) cooldown entry survives rescan, (c) stderr is visible in docker logs, (d) a perpetually-failing policy gets exponential backoff.



## Tags

scheduler, ops, observability, rpc, cooldown, backoff
