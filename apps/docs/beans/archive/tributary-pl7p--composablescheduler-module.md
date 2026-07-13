---
# tributary-pl7p
title: ComposableScheduler module
status: completed
type: task
priority: high
created_at: 2026-06-26T21:15:37Z
updated_at: 2026-06-26T21:35:39Z
---

Create apps/scheduler/src/composable.ts — monitors ComposablePolicy accounts and fires executeComposable when schedule + validation triggers are ready.

## Summary of Changes

Created `apps/scheduler/src/composable.ts` — `ComposableScheduler` class implementing the full composable-policy polling scheduler per spec:

- **30s poll + 10min rescan**: `setInterval`-based, in-memory policy list keyed by gateway.
- **Gateway-scoped discovery**: `composablePolicy.all([{ memcmp: offset 41 }])` filters by gateway PDA.
- **Hybrid prefilter (Phase 1)**: ONE `getMultipleAccountsInfo` batch-fetches validation PDAs + both candidate target accounts (recipient + recipient output-ATA). Lighthouse assertions deserialized via vendored `lighthouse-sdk-legacy` serializers (accountInfo/tokenAccount families; unknown → defer to sim). Schedule readiness covers Subscription/Milestone/PayAsYouGo (period-cap aware).
- **Parallel fire (Phase 2)**: `Promise.all` per fireable policy; each builds its own DLMM swap ix (hostFeeIn fix applied), simulates, then sendAndConfirm.
- **3-strike circuit breaker**: fixed 5-min cooldown at 3 consecutive failures; resets on success or rescan; half-open on expiry.
- **Static FORWARD_CONTEXT**: USDC:WSOL → Meteora DLMM pool, 1% slippage, hostFeeIn fix.
- Exports `ComposableScheduler` only (index.ts wiring is a separate step).

Supporting changes:
- `apps/scheduler/package.json`: added `@meteora-ag/dlmm`, `lighthouse-sdk-legacy` deps; replaced stale `@typescript-eslint/*` v6 with unified `typescript-eslint` v8 + `@eslint/js` + `globals`.
- `apps/scheduler/eslint.config.js`: new flat config (eslint 10 requires it; scheduler previously had none).

ponytail simplifications (marked inline):
- Validation target derivation is heuristic (accountInfo→recipient, tokenAccount→recipient output-ATA) — covers both topup flows; num>1/unknown defers to simulation.
- Lighthouse multi-assertion variants not handled (single-variant only) — defers to sim.
- memcmp gateway offset 41 hand-computed from Borsh layout.

Lint + tsc --noEmit both pass clean.
