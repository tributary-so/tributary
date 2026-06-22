# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **`ComposablePolicy.forward_config.min_output_amount` semantics aligned
  with DeFi convention.** The `min_output_amount` check in
  `execute_composable` now runs AFTER gateway/protocol fee deduction and
  compares against the NET `sweep_amount` the recipient actually receives
  (was: gross forward-program output, pre-fee). This matches the
  `amountOutMin` convention used by Uniswap and Jupiter. Because the
  forward CPI is currently disabled (B1 — separate finding), this change
  has no observable runtime effect today; it lands ahead of forward-CPI
  enablement so integrators can rely on net semantics from day one.
  See `reports/M5-min-output-amount-checked-before-fees.md`.

- **Breaking:** `PaymentRecord.record_id` now reflects the post-increment
  `payment_count` (was pre-increment). The first execution of a policy emits
  `record_id = 1` instead of `0`. This honors `Subscription::max_renewals`
  ceilings exactly, since the counter is now incremented inside
  `strategy.execute()` (see `programs/tributary/src/policies/traits.rs`)
  before `should_pause_policy` is evaluated. Off-chain indexers that assumed
  0-indexed records must add 1 to historical data or display
  `payment_count - 1` for backward compatibility.
