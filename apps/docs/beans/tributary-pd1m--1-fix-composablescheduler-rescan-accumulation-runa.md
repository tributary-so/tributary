---
# tributary-pd1m
title: '#1 Fix ComposableScheduler rescan accumulation (runaway RPC root cause)'
status: todo
type: task
priority: critical
created_at: 2026-07-21T09:22:56Z
updated_at: 2026-07-21T09:25:10Z
parent: tributary-ben2
blocked_by:
    - tributary-6m8o
---

assigned: implementer

## Problem

apps/scheduler/src/composable.ts:248-252 in rescanAll() APPENDS to this.watched instead of REPLACING:

  const existing = this.watched.get(keypair.publicKey.toBase58()) ?? [];
  this.watched.set(keypair.publicKey.toBase58(), [...existing, ...watched]);

Every 10-min rescan re-fetches the same policies and appends. Production log evidence:

  12:43  1/1 fireable
  12:53  2/2 fireable   (after 1st rescan)
  13:03  3/3 fireable
  ...
  05:13 100/100 fireable  (~16h later)

Each tick (POLL_INTERVAL_MS=30s) fires the whole list in parallel via Promise.all (composable.ts:300-306). Each fire() burns >=4 RPC calls (resolveValidationTargets x2 + getLatestBlockhash + simulateTransaction). At 100 dups: ~400-500 RPC calls per tick, ~1000/min.

THIS IS THE PRIMARY RPC COST DRIVER. Ship before any other fix.

## Fix

Per-signer accumulation must happen inside rescanAll's loop, then set ONCE. Suggested shape:

  for (const keypair of this.gatewayKeypairs) {
    const gatewayPdas = this.signerToGatewayPdas.get(keypair.publicKey.toBase58()) ?? [];
    const bucket: WatchedPolicy[] = [];
    for (const gatewayPda of gatewayPdas) {
      // ... existing per-gateway fetch ...
      bucket.push(...watched);
    }
    // dedupe by PDA (defensive - same policy should not legitimately appear under two gateways)
    const dedup = new Map<string, WatchedPolicy>();
    for (const w of bucket) dedup.set(w.publicKey.toBase58(), w);
    this.watched.set(keypair.publicKey.toBase58(), [...dedup.values()]);
  }

Note the inner  line stays (per-gateway count is useful).

## Acceptance

- Run scheduler against Surfpool for >=30 min (3+ rescan cycles). fireable count stays constant across rescans (no monotonic growth).
- Grep rescan log lines: per-gateway counts add up to the per-signer watched count exactly.
- Manual diff: print this.watched.size before and after rescan in a debug log; verify equal.



## Tags

scheduler, ops
