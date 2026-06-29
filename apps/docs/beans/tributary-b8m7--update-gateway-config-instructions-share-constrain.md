---
# tributary-b8m7
title: Update gateway config instructions — share constraint + scheduler share setter
status: todo
type: task
priority: high
created_at: 2026-06-29T12:49:25Z
updated_at: 2026-06-29T12:49:25Z
parent: tributary-5gf3
blocked_by:
    - tributary-wuhf
---

Gateway configuration instruction updates for ADR-0017.

Affected instructions:
- create_payment_gateway: accept scheduler_share_bps at creation; enforce constraint
- change_gateway_fee_bps: re-check constraint after fee change (gateway_fee_bps itself doesn't affect the sum, but re-validate for safety)
- NEW instruction (or extend existing): update_gateway_scheduler_share — gateway-authority-only setter for scheduler_share_bps
- update_gateway_referral_settings: already writes referral_allocation_bps — re-check constraint
- The protocol-admin override instruction (update_gateway_protocol_fee / equivalent): rename semantics — sets custom_protocol_share_bps (admin-only)

Constraint to enforce at EVERY write site:
  effective_protocol_share + scheduler_share_bps + referral_allocation_bps <= 10000
where effective_protocol_share = custom_protocol_share_bps if FEATURE_CUSTOM_PROTOCOL_FEE set, else global protocol_share_bps from ProgramConfig.

TDD: tests for constraint acceptance at boundary (9999 ok, 10001 reject), each write site enforces independently, admin-override path enforces.
