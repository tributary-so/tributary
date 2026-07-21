---
# tributary-asrs
title: '#6 Add cooldown / consecutive-failure skip-list to PaymentScheduler'
status: todo
type: task
priority: high
created_at: 2026-07-21T09:24:26Z
updated_at: 2026-07-21T09:25:10Z
parent: tributary-ben2
---

assigned: implementer

## Problem

apps/scheduler/src/payments.ts has NO cooldown mechanism. checkAndExecutePayments runs every 5 min (CRON_SCHEDULE default), tries every active due policy, logs 0 executed / 19-20 errors - EVERY cycle, for 23h, 278 cycles, ~5280 wasted sendAndConfirm paths.

The 19-20 failures are silent (see task #2 - stderr lost). They include:
- 4 subscription fails (ConTf signer, CwNybLVQ gateway): policies 7NtD, 8XRj, 91h9, 9rQg
- 2 subscription fails (ALLx signer, 6ntm5rWq gateway): 8L3i, F1AC
- 13 milestone 1/1 fails (YUMZa signer, B5kxaBwR gateway): 2MFg, 2PKX, 2yFW, 3T7A, 3zCn, 5PK4, 6X84, 74a6, 9E1g, EDxU, FWcb, GxaW, HJFD

Note: 13 milestones with currentMilestone=0, totalMilestones=1 - execution fails so currentMilestone never advances, shouldExecutePayment returns true forever.

## Fix

Mirror ComposableScheduler's cooldown pattern:
- Add private cooldowns: Map<string, CooldownEntry> to PaymentScheduler class (or extract a shared CooldownMap utility if a third use emerges - don't pre-abstract).
- In the per-policy catch block (payments.ts:145-154): call recordFailure(policyPda) on error.
- In the per-policy loop BEFORE shouldExecutePayment: check cooldown, skip if active, log 'on cooldown - skipping'.
- Use same constants as composable.ts but local to payments.ts (or shared constants file): MAX_FAILURES=3, COOLDOWN_MS=5*60_000. After task #3 lands, mirror the backoff.
- Clear cooldowns at start of each checkAndExecutePayments cycle? NO - that defeats the purpose. Cooldowns persist across cron ticks.

## Acceptance

- Simulate 3 consecutive failures for one policy: 4th cron tick skips it with a log line.
- A policy that succeeds has its cooldown entry cleared (so it's eligible next cycle if it later starts failing).
- Manual run: confirm the 19-error-per-cycle pattern degrades to 19 errors once, then 0 errors (all on cooldown) for the next ~5min.



## Tags

scheduler, ops
