---
# tributary-d3do
title: "#3 Exponential backoff + reset consecutiveFailures on success"
status: completed
type: task
priority: high
created_at: 2026-07-21T09:22:56Z
updated_at: 2026-07-21T09:25:10Z
parent: tributary-ben2
---

assigned: implementer

## Problem

apps/scheduler/src/composable.ts:550-566 recordFailure():

- entry.consecutiveFailures += 1 (never reset except by full entry.delete on success)
- if (entry.consecutiveFailures >= MAX_FAILURES=3) entry.cooldownUntil = now + COOLDOWN_MS=5\*60_000

Once first strike hits, every subsequent failed fire (post-cooldown-expiry) re-strikes immediately because consecutiveFailures keeps growing (4,5,6...). The 5-min cooldown is flat - no backoff. A policy failing for 23h gets retried at the same cadence as one that failed once.

## Fix

- Cap the multiplier: cooldownUntil = now + COOLDOWN_MS \* Math.pow(2, Math.min(Math.floor(entry.consecutiveFailures / MAX_FAILURES), 6)) -> max 64x = ~5h30m
- Cap absolute max: min(cooldownUntil, now + 30\*60_000) - never cool down longer than 30 min (configurable constant).
- Add COOLDOWN_MAX_MS constant next to COOLDOWN_MS.
- No change needed to the success path (cooldowns.delete already correct).

## Acceptance

- Unit-style test (or manual): simulate 1, 3, 6, 9, 12 consecutive failures; verify cooldown grows geometrically then caps at 30min.
- Log line includes the multiplier: 'hit N strikes - cooldown Xs (backoff 2^k)'.
- First failure within a fresh window still triggers original 5min behaviour.

## Tags

scheduler, ops

## Summary of Changes

- **`composable.ts` + `payments.ts`**: Added `COOLDOWN_MAX_MS = 30min`. `recordFailure()` now uses exponential backoff: `cooldownMs = min(COOLDOWN_MS * 2^k, COOLDOWN_MAX_MS)` where `k = floor((consecutiveFailures - MAX_FAILURES) / MAX_FAILURES)`, capped at 6.
- Backoff schedule: 3 strikes → 5min (original), 6 → 10min, 9 → 20min, 12 → 30min (cap). Log line includes the strike count and backoff exponent.
- Success path unchanged (`cooldowns.delete` already clears `consecutiveFailures`).
