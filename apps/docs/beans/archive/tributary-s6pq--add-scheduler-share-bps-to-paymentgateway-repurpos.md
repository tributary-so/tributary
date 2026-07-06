---
# tributary-s6pq
title: Add scheduler_share_bps to PaymentGateway; repurpose ProgramConfig field
status: completed
type: task
priority: high
created_at: 2026-06-29T12:49:25Z
updated_at: 2026-06-29T13:12:05Z
parent: tributary-5gf3
blocked_by:
    - tributary-wuhf
---

State-account changes for ADR-0017 (depends on child A's new FeeBreakdown shape).

PaymentGateway:
- ADD field: scheduler_share_bps: u16 (per-gateway, gateway-authority-set)
- KEEP: gateway_fee_bps (now semantically the ONE total fee), referral_allocation_bps, referral_tiers_bps, feature_flags, fee_recipient, signer
- custom_protocol_fee_bps: repurposed — the admin now sets a custom protocol SHARE (override of protocol_share_bps), not a custom protocol BPS-of-payment. If currently stored on PaymentGateway, rename to custom_protocol_share_bps.

ProgramConfig:
- RENAME: protocol_fee_bps → protocol_share_bps (same u16, repurposed from bps-of-payment to share-of-gateway-fee)
- KEEP: admin, fee_recipient, emergency_pause

Account sizing: PaymentGateway grows by 2 bytes (u16). Update SPACE constant. Pre-launch, no live accounts to migrate.

TDD: account-init tests, serialize/deserialize round-trip, field-offset checks.

## Summary of Changes

Done in 7f0fe81. scheduler_share_bps added to PaymentGateway (2 bytes, padding reduced 117→115). custom_protocol_fee_bps renamed to custom_protocol_share_bps. ProgramConfig.protocol_fee_bps renamed to protocol_share_bps. validate_combined_bps → validate_share_constraint. effective_protocol_fee_bps → effective_protocol_share_bps. 4 gateway struct tests pass.
