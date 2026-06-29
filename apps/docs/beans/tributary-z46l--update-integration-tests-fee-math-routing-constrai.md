---
# tributary-z46l
title: Update integration tests — fee math, routing, constraint, NET_AMOUNT
status: todo
type: task
priority: normal
created_at: 2026-06-29T12:50:00Z
updated_at: 2026-06-29T12:50:00Z
parent: tributary-5gf3
blocked_by:
    - tributary-62t8
    - tributary-b8m7
---

Integration test suite updates for ADR-0017 (depends on the routing landing in child D).

tests/ (jest, runs against Surfpool):

Fee math:
- Carve-out split correctness (protocol + scheduler + referral + residual == total_fee)
- Residual is exactly the balancing item (no rounding leak)
- Zero scheduler_share → trusted path, no scheduler account needed
- Zero protocol_share (admin override) → protocol gets nothing
- NET_AMOUNT gross vs net produces correct pull sizes and recipient amounts

Constraint enforcement:
- Gateway creation rejects sum > 10000
- update scheduler share rejects if it would exceed
- update referral settings rejects if it would exceed
- Admin override path rejects if it would exceed

Routing (execute_payment + execute_composable):
- Trusted path (gateway signer): scheduler cut lands in gateway.fee_recipient alongside residual (one combined credit)
- Permissionless path (third-party signer): scheduler cut lands in signer ATA, residual in gateway.fee_recipient
- Owner self-crank: cut to owner ATA
- Recipient self-crank: cut to recipient ATA
- Wrong-owner ATA supplied as remaining_account → revert
- Missing remaining_account on permissionless path → revert
- Composable min_output_amount checked against net (post-fee) output — unchanged but re-verify

Existing tests that assumed the old two-number model: update assertions to the carve-out model.

TDD: these tests are written FIRST (red), then children A-D make them green.
