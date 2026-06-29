---
# tributary-uon1
title: Update SDK fee helpers + gateway creation/config APIs
status: todo
type: task
priority: normal
created_at: 2026-06-29T12:50:00Z
updated_at: 2026-06-29T12:50:00Z
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
