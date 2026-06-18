---
# tributary-4ykh
title: 'L-01: PayAsYouGo accepts payment_amount = 0'
status: in-progress
type: bug
priority: low
created_at: 2026-06-18T14:49:44Z
updated_at: 2026-06-18T14:49:56Z
---

PayAsYouGoStrategy::calculate_payment_amount returns provided_amount.unwrap_or(max_chunk_amount) without rejecting 0. validate_payment_constraints only checks <= max_chunk_amount, not > 0. A caller can execute_payment(Some(0)) on the legacy path, passing all validation, skipping the three transfer CPIs (each gated by 'if amount > 0'), yet still increment payment_count, update total_paid, and emit a PaymentRecord event with amount = 0. Composable path is already defended via shared::schedule::validate_policy_execution line 79.

Fix: add require!(amt > 0, TributaryError::InvalidAmount) in calculate_payment_amount after resolving amt, and mirror the check in validate_payment_constraints for defense in depth. Per reports/L-01-payg-accepts-zero-amount.md and shared-base §19.

## TODO

- [ ] RED: add Rust unit tests in pay_as_you_go.rs for calculate_payment_amount(Some(0)) rejection and validate_payment_constraints(0) rejection
- [ ] GREEN: add require!(amt > 0, TributaryError::InvalidAmount) in calculate_payment_amount; mirror in validate_payment_constraints
- [ ] cargo test -p tributary --lib green
- [ ] anchor build green
- [ ] Update bean with Summary of Changes
