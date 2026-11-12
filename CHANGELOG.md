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

### Fixed

- **`Subscription` with `auto_renew = false` and no `max_renewals` no longer
  charges forever.** `advance_policy` only checked `auto_renew` inside the
  `Some(max_renewals)` branch, so such a policy never reached `Completed` and
  the scheduler kept charging the payer every period (7 live mainnet policies
  affected; one already double-charged). `auto_renew = false` now completes
  the policy after one execution regardless of whether a renewal ceiling is
  set, matching the documented "pauses after next payment" semantics.
  (SZ-M-1, Slot Zero 2026-11-08 §T1; bean tributary-lull)

- **A pre-funded intermediate account no longer bricks composable
  execution.** The deterministic intermediate ATA and validation-PDA
  addresses are public and empty between uses, so a griefer could occupy
  them for ~0.00065 SOL and fail every later `execute_composable` /
  `create_composable_policy`. Execution now adopts an already-created
  intermediate after validating data-owner program, mint, and token-owner
  (the policy PDA) in depth — a non-zero donated balance is swept by
  settlement and does not disqualify. Policy create adopts a raw-SOL
  pre-funded validation PDA via `allocate` + `assign` + rent top-up (the
  PDA signs for itself). Residual: raw SOL at the canonical ATA address
  stays un-creatable by anyone (no signature exists) — delete + recreate
  remains the exit for that burn-the-rent variant.
  (SZ-M-2, Slot Zero 2026-11-08 §T2; bean tributary-cpqp)

- **Referral tiers are validated at every write, and distribution is
  pool-bounded.** A gateway authority could store arbitrary
  `referral_tiers_bps` while referral was dormant, enable referral via
  `update_gateway_feature_flags` (which validated nothing), and let
  `process_referral_rewards` pay `pool × tier_bps / 10000` per level with
  no sum cap — debiting payers beyond the documented fee bound (review
  repro: 10.933 USDC on a 10 USDC gross policy). Three independent gates
  now close it: explicit tier writes validate at write time, enabling
  referral (flags path) validates the stored tiers whenever a live
  allocation exists, and `compute_tier_rewards` caps the distributed sum
  at the pool with u128 intermediates (also fixing the latent u16-sum
  overflow in `validate_referral_tiers`, which panicked on exactly the
  malicious candidates it had to reject). Dormant today — no gateway has
  referral enabled.
  (SZ-M-3, Slot Zero 2026-11-08 §T3; bean tributary-k84k)
