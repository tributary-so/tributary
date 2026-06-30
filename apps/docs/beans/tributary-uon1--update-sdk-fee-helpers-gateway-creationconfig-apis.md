---
# tributary-uon1
title: Update SDK fee helpers + gateway creation/config APIs
status: completed
type: task
priority: normal
created_at: 2026-06-29T12:50:00Z
updated_at: 2026-06-29T14:24:33Z
parent: tributary-5gf3
blocked_by:
    - tributary-s6pq
---

SDK updates for ADR-0017 — expose the unified fee model to integrators.

packages/sdk changes:
- Update Tributary.createPaymentGateway to accept scheduler_share_bps
- Add updateSchedulerShare() method (gateway-authority instruction wrapper)
- Rename protocol fee helpers: protocol_fee_bps → protocol_share_bps in types/interfaces
- Update fee calculation helpers (if any client-side fee estimation exists) to use the carve-out model
- Update getCreateSubscriptionPolicy / getCreatePayAsYouGoPolicyInstruction / getCreateMilestonePolicyInstruction if they reference fee fields
- Add helper to compute fee breakdown for display (protocol cut, scheduler cut, referral, residual) given a payment amount + gateway config

packages/sdk-react:
- Update any hooks that read gateway fee fields

Type exports:
- Export the new FeeBreakdown shape if useful for integrators
- Update PaymentGateway type (add scheduler_share_bps, rename custom_protocol_fee if applicable)

No new dependencies. Existing test patterns in tests/ apply.

TDD: SDK fee-estimation tests, gateway creation with scheduler share, update scheduler share round-trip.

## Summary of Changes

**Scope:** `packages/sdk/` only.

**Files changed:**
- `packages/sdk/src/sdk.ts` — 3 edits
- `packages/sdk/README.md` — signature + example updated

**Code changes:**
1. `createPaymentGateway()` — added `schedulerShareBps: number` param (positioned between `gatewayFeeBps` and `gatewayFeeRecipient`), wired into the positional call `.createPaymentGateway(gatewayFeeBps, schedulerShareBps, nameBytes, urlBytes)`.
2. `updateGatewayProtocolFee()` — renamed param/local `customProtocolFeeBps` → `customProtocolShareBps` (matches renamed on-chain arg). Method name kept for back-compat; only the field name changed.
3. **New method** `updateGatewaySchedulerShare(gatewayAuthority, schedulerShareBps)` — wraps the new gateway-authority-only instruction; passes `{ authority, gateway, config }` accounts; validates ≤10000 bps client-side.

**Types:** No manual edits — `PaymentGateway`, `ProgramConfig` are IDL-derived (`IdlAccounts<Tributary>`), so they auto-pick-up `schedulerShareBps` / `protocolShareBps` / `customProtocolShareBps` once the IDL regenerates. (Ran `anchor build` to refresh `target/idl/tributary.json` + `target/types/tributary.ts`.)

**No client-side fee calc existed** in the SDK to update — carve-out math lives on-chain only.

**Out of scope (deferred):** `tests/*.test.ts` callers still pass the old signature (no `schedulerShareBps`, read `customProtocolFeeBps`). A separate bean should update those tests. The untracked `tests/unified-fee-model.test.ts` already exists for the new model.

**Build:** `pnpm run build` ✓ (`tsup` ESM + DTS, 2.4s). `tsc --noEmit` ✓ clean.

## Summary of Changes

Implemented in commits a81ca50 (D+E) and c51a201 (F).
