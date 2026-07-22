---
# tributary-u9hz
title: "#4 Stop clearing cooldowns in rescanAll"
status: completed
type: task
priority: high
created_at: 2026-07-21T09:22:56Z
updated_at: 2026-07-21T09:25:10Z
parent: tributary-ben2
---

assigned: implementer

## Problem

apps/scheduler/src/composable.ts:217 - rescanAll() opens with this.cooldowns.clear(). Every 10-min rescan pardons every failing policy, even ones that just struck. Combined with bug #1 (rescan dups), this guaranteed every rescan window would re-fire the same failing PDA.

The rescan's job is to refresh the POLICY SET (new policies added, deleted ones removed), not to reset failure state. Those are orthogonal concerns.

## Fix

- Remove this.cooldowns.clear() at composable.ts:217.
- Cooldown state survives rescans; only expires via the natural cooldownUntil check in prefilter (composable.ts:314-324).
- Edge case: if a policy disappears from watched (deleted on-chain), its cooldown entry becomes orphaned. Clean up orphans opportunistically - at end of rescanAll, prune cooldowns keys not in the new watched set:

  const livePdas = new Set(this.allWatchedPdas());
  for (const key of [...this.cooldowns.keys()]) {
  if (!livePdas.has(key)) this.cooldowns.delete(key);
  }

(Add a small private helper allWatchedPdas() that flattens this.watched.)

## Acceptance

- Force a policy to strike (3 failures), trigger rescan manually, verify the cooldown entry is still present in the next tick's prefilter log.
- Delete a policy on-chain, trigger rescan, verify its cooldown entry is pruned.
- Cooldown expiry behaviour unchanged.

## Tags

scheduler, ops

## Summary of Changes

- **`composable.ts`**: Removed `this.cooldowns.clear()` from `rescanAll()`. Cooldown state now survives rescans — failing policies stay cooled down across the 10-min rescan boundary. Added orphan pruning after `this.watched = fresh`: cooldown entries for policies no longer in the watched set (deleted/closed on-chain) are cleaned up.
