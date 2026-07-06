---
# tributary-y4wq
title: Composable policy scheduler
status: completed
type: feature
priority: high
created_at: 2026-06-26T21:12:16Z
updated_at: 2026-06-27T11:55:41Z
---

Build a composable-policy scheduler in apps/scheduler/src/composable.ts that monitors ComposablePolicy accounts and fires executeComposable when both the schedule and validation triggers are ready.

Design decisions (locked in grilling session):
- Q1: Per-policy state-poll, two cadence classes (cron for timestamp triggers, 30s poll for state predicates)
- Q2: Boot scan + periodic rescan (5-15 min), no persistence, no events
- Q3: Hybrid trigger evaluator — cheap white-box Lighthouse prefilter → simulateTransaction gate → fire
- Q4: Static FORWARD_CONTEXT map keyed by inputMint:outputMint, skip-silently with log on missing
- Q5: Extend apps/scheduler, new composable.ts, one process two loops
- Q6: Parallel fires, each fire fetches pool state independently (no shared batch-quote)
- Q7: Log + retry next tick, 3-strike → 5-min cooldown (half-open, in-memory, resets on success/rescan)
- Signing: Gateway-signer-only, gateway.signer = fee_payer

Tasks:
- [x] Add Trigger and Forward context terms to CONTEXT.md
- [x] Draft ADR-0014 (composable scheduler trigger model)
- [x] Implement white-box Lighthouse prefilter (evaluator for emitted assertion families)
- [x] Implement forward-context map + DLMM forward-ix builder
- [x] Implement fire path (build ix → simulate → send)
- [x] Implement cooldown circuit-breaker (3-strike, 5-min, in-memory)
- [x] Wire composable loop into apps/scheduler/src/index.ts alongside existing cron
- [x] Add ENABLE_COMPOSABLE flag to gate the new loop
- [x] Unit tests: 31/31 pass (evaluator + schedule readiness + Lighthouse round-trip). Surfpool integration: manual follow-up (requires running fork + matching gateway keypair)


## Summary of Changes

- ADR-0014: composable scheduler trigger model (per-policy state-poll, not cron)
- CONTEXT.md: added Trigger + Forward context domain terms
- apps/scheduler/src/evaluator.ts: pure Lighthouse evaluator + schedule readiness (extracted for testability)
- apps/scheduler/src/composable.ts: ComposableScheduler class (30s poll, 10min rescan, hybrid prefilter+sim gate, parallel fires, 3-strike cooldown)
- apps/scheduler/src/index.ts: ENABLE_COMPOSABLE flag wiring
- apps/scheduler/package.json: added @meteora-ag/dlmm + lighthouse-sdk-legacy deps
- jest.config.js + jest.tsconfig.json: ts-jest config for unit tests
- tests/scheduler-evaluator.test.ts: 31 unit tests (all passing)
- apps/scheduler/README.md: documented ENABLE_COMPOSABLE flag
- Bug fix: ValidationPDA missing from remainingAccounts[0] in fire path
- Bug fix: Lighthouse discriminator is byte 0, not u32 at offset 0
