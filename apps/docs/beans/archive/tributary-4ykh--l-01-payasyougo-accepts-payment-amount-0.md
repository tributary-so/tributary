---
# tributary-4ykh
title: 'L-01: PayAsYouGo accepts payment_amount = 0'
status: completed
type: bug
priority: low
created_at: 2026-06-18T14:49:44Z
updated_at: 2026-06-18T14:52:54Z
---

PayAsYouGoStrategy::calculate_payment_amount returns provided_amount.unwrap_or(max_chunk_amount) without rejecting 0. validate_payment_constraints only checks <= max_chunk_amount, not > 0. A caller can execute_payment(Some(0)) on the legacy path, passing all validation, skipping the three transfer CPIs (each gated by 'if amount > 0'), yet still increment payment_count, update total_paid, and emit a PaymentRecord event with amount = 0. Composable path is already defended via shared::schedule::validate_policy_execution line 79.

Fix: add require!(amt > 0, TributaryError::InvalidAmount) in calculate_payment_amount after resolving amt, and mirror the check in validate_payment_constraints for defense in depth. Per reports/L-01-payg-accepts-zero-amount.md and shared-base §19.

## TODO

- [x] RED: add Rust unit tests in pay_as_you_go.rs for calculate_payment_amount(Some(0)) rejection and validate_payment_constraints(0) rejection
- [x] GREEN: add require!(amt > 0, TributaryError::InvalidAmount) in calculate_payment_amount; mirror in validate_payment_constraints
- [x] cargo test -p tributary --lib green (48 passed: 44 existing + 4 new)
- [x] anchor build green (only pre-existing H-05 stub warnings)
- [x] Update bean with Summary of Changes

## Summary of Changes

**L-01 fixed.** `PayAsYouGoStrategy` now rejects `payment_amount = 0` at both the calculation and constraint-validation layers, closing the legacy `execute_payment` path that allowed a caller to pass `Some(0)`, skip every transfer CPI (each gated by `if amount > 0`), yet still increment `payment_count` and emit a zero-amount `PaymentRecord` event.

### Rust changes (`programs/tributary/src/policies/pay_as_you_go.rs`)

- **`calculate_payment_amount`** — resolves `amt = provided_amount.unwrap_or(*max_chunk_amount)` first, then issues `require!(amt > 0, TributaryError::InvalidAmount)` before returning. `validate_payg_policy` already guarantees `max_chunk_amount > 0` at policy creation, so the `None` branch was always safe; only the explicit `Some(0)` was the hole.
- **`validate_payment_constraints`** — added the same `require!(payment_amount > 0, TributaryError::InvalidAmount)` ahead of the existing `<= max_chunk_amount` check, as defense-in-depth for any future caller that bypasses `calculate_payment_amount` or for directly-serialized malformed accounts.

### Tests

Added a `#[cfg(test)] mod tests` block in the same file with four unit tests:

1. `calculate_payment_amount_rejects_explicit_zero` — RED→GREEN: `Some(0)` now errors.
2. `validate_payment_constraints_rejects_zero` — RED→GREEN: passing `0` to constraint validation now errors.
3. `accepts_positive_chunk_within_bounds` — positive control: `Some(50)` still accepted by both layers.
4. `none_provided_defaults_to_max_chunk_amount` — positive control: `None` still falls back to `max_chunk_amount` (validated > 0 at create time).

A `payg_policy(...)` helper builds a minimal `PaymentPolicy` with a `PayAsYouGo` variant; the helper is pure data, no CPI / runtime needed, so the strategy methods can be exercised directly.

### Verification

- `cargo test -p tributary --lib` → **48 passed** (44 pre-existing + 4 new). 0 failed.
- `anchor build` → success. Only warnings are the pre-existing `dead_code` / `unused_variables` for the stubbed Step 5 forward path (tracked separately by bean `tributary-y35e`, H-05).
- Composable path was already defended independently via `shared::schedule::validate_policy_execution` line 79 (`require!(chunk > 0, TributaryError::InvalidAmount)`) — no change needed there.

### Severity / Risk

Two new `require!` gates, both pure additions on the failure path. No behavioral change for legitimate callers (positive chunks pass exactly as before). No existing test fixture or integration path is affected — the SDK/integration tests always pass positive amounts. Low risk.
