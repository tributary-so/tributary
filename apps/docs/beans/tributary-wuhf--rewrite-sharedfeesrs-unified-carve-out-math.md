---
# tributary-wuhf
title: Rewrite shared/fees.rs — unified carve-out math
status: todo
type: task
priority: high
created_at: 2026-06-29T12:48:52Z
updated_at: 2026-06-29T12:48:52Z
parent: tributary-5gf3
---

Replace the two-independent-numbers calculate_fees() with the unified carve-out model (ADR-0017).

Current (shared/fees.rs): takes payment_amount, gateway_fee_bps, custom_protocol_fee_bps, protocol_fee_bps, is_custom_protocol_fee, is_net_mode. Computes gateway_fee and protocol_fee independently on payment_amount, then applies net/gross.

New signature (proposed):
  calculate_fees(
    payment_amount: u64,
    gateway_fee_bps: u16,           // the ONE total
    protocol_share_bps: u16,        // global (or per-gateway override)
    scheduler_share_bps: u16,       // per-gateway
    referral_allocation_bps: u16,   // per-gateway (existing field)
    is_net_mode: bool,
  ) -> FeeBreakdown

FeeBreakdown gains: protocol_cut, scheduler_cut, referral_pool, gateway_residual, recipient_amount, total_from_user.

Logic:
1. total_fee = payment_amount × gateway_fee_bps / 10000
2. protocol_cut = total_fee × protocol_share_bps / 10000
3. scheduler_cut = total_fee × scheduler_share_bps / 10000
4. referral_pool = total_fee × referral_allocation_bps / 10000
5. gateway_residual = total_fee − protocol_cut − scheduler_cut − referral_pool
6. NET_AMOUNT: gross → total_from_user = payment_amount, recipient = payment_amount − total_fee; net → total_from_user = payment_amount + total_fee, recipient = payment_amount

TDD: write tests first covering — basic split math, residual-is-balancing-item, net vs gross, zero-shares edge cases, overflow checks.
