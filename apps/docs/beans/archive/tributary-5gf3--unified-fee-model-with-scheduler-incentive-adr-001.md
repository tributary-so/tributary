---
# tributary-5gf3
title: Unified fee model with scheduler incentive (ADR-0017)
status: completed
type: epic
priority: high
created_at: 2026-06-29T12:35:19Z
updated_at: 2026-06-29T14:24:47Z
---

Implements ADR-0017 (apps/docs/adr/0017-unified-fee-model.md), supersedes ADR-0006. Moves from two independent fee numbers (protocol_fee_bps + gateway_fee_bps) to ONE gateway_fee_bps (total) with carve-outs: protocol share (global, admin-set, per-gateway admin override), scheduler share (per-gateway, gateway-set — NEW), referral allocation (per-gateway, unchanged), gateway residual (balancing).

Protocol-wide: both PaymentPolicy and ComposablePolicy (they share PaymentGateway). No absolute protocol floor — the share rate is the mechanism.

Scheduler cut routing: trusted path (signer == gateway.signer) merges into gateway.fee_recipient; permissionless path routes to signer ATA via remaining_account (verified owner == signer && mint == source_mint).

NET_AMOUNT survives (orthogonal). FEATURE_CUSTOM_PROTOCOL_FEE survives (admin-granted per-gateway override, can be zero).

Proposed children (TDD per child):
- A: Rewrite shared/fees.rs — unified carve-out math (protocol_share, scheduler_share, referral_allocation, residual)
- B: Add scheduler_share_bps to PaymentGateway; repurpose ProgramConfig.protocol_fee_bps → protocol_share_bps
- C: Update gateway config instructions — constraint sum(shares) <= 10000 at every write site; add update scheduler share instruction
- D: Wire scheduler cut routing in execute_payment + execute_composable (consolidated for gateway.signer, remaining_account ATA for others)
- E: Update SDK fee helpers + gateway creation/config APIs
- F: Update tests (fee math, routing, constraint enforcement, NET_AMOUNT interaction)

Sibling to tributary-pdj8 (permissionless composable execution). tributary-pdj8 opens execution to any caller; this epic provides the financial incentive for third parties to actually do it.

## Summary of Changes

All 6 children completed (A-F). Three commits:
- 7f0fe81: Core unified fee model (A: fees.rs rewrite, B: struct changes, C: gateway config instructions)
- a81ca50: Scheduler cut routing (D) + SDK APIs (E)
- c51a201: Test file updates for all 6 test files (F)

Build: cargo build ✓ | cargo test --lib: 79 passed | SDK build ✓ | tsc --noEmit: 0 errors in tests/
