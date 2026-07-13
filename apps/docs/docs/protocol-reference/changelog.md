# Changelog

All notable changes to the Tributary protocol are documented here. Dates are
the date a change landed on Mainnet (or `Unreleased` while in review).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — Composable Policy Release

The composable-policy family merges into the regular program: validation
hooks (Lighthouse) and forward hooks (Meteora DLMM) are now first-class
citizens alongside direct pull payments.

### Added

- **`PolicyType::OneTime`** (discriminator `3`) — fixed-amount, single-fire
  pull payment with the full gateway lifecycle (PDA, pausable, deletable,
  schedulable, composable hooks). `due_date <= 0` = immediate;
  `expiry_date = None` = never expires. See ADR-0019.
- **`PolicyType::UpTo`** (discriminator `4`) — single-use, time-bound
  variable-amount authorization. Caller-supplied settle amount bounded by
  `max_amount` (`0 <= actual <= max`, enforced on-chain from the immutable
  policy). Recipient-triggerable like Pay-as-you-go. The x402 `upto`
  primitive. See ADR-0020.
- **`PolicyExpired`** error variant — shared by OneTime's `expiry_date` and
  UpTo's `deadline` gates.
- **SDK** — `getCreateOneTimePolicyInstruction` / `createOneTimePayment` and
  `getCreateUpToPolicyInstruction` / `createUpToAuthorization` / `settleUpTo`.
- **x402 package** — `"x402://upto"` scheme with verify + settle helpers
  (`src/upto.ts`) and short-lived JWT (`exp = deadline`).
- **`ComposablePolicy`** account and instructions (`create_composable_policy`,
  `execute_composable`, `change_composable_status`,
  `delete_composable_policy`) — programmable pull payments with optional
  validation + forward hooks executed between the pull and the settlement.
- **`ValidationPda`** account (`["composable_validation", composable_policy]`)
  — separate account for Lighthouse assertion data (≤512 bytes), decoupling
  storage cost from the `ComposablePolicy` itself.
- **`ForwardConfig` + `ByteRangeCheck`** — on-chain instruction-data
  validation for forward CPIs. Up to 4 byte-range checks per policy; at least
  one must pin the discriminator at offset 0.
- **`ValidationConfig`** — opt-in validation hook; `SystemProgram` sentinel
  disables it.
- **`NATIVE_OUTPUT` forward flag** (`FORWARD_FLAG_NATIVE_OUTPUT = 1`) — WSOL
  → native SOL sweep via a Tributary-controlled `closeAccount` whose
  destination is pinned to `recipient` on-chain. Requires
  `output_mint == NATIVE_MINT`.
- **Lighthouse SDK facade** in `@tributary-so/sdk` — fluent builder for
  assertion data (`lighthouse.tokenAccount(ata).amount(n, "<").build()`),
  wrapping the vendored official Lighthouse client.
- **Referral program** — `ReferralAccount`, 3-level chain, configurable
  gateway-scoped allocation and tiers.
- **`ProgramConfig.emergency_pause`** — global pause flag that blocks all
  `execute_payment` and `execute_composable` calls.
- **`PaymentsDelegate`** legacy PDA accepted for backward compatibility with
  v0-approved token accounts.

### Changed

- **`PolicyType` enum is now shared** between `PaymentPolicy` and
  `ComposablePolicy`. Previously composable had a duplicate `ScheduleType`
  that drifted in month arithmetic; both now use the unified, 128-byte-fixed
  enum. See `reports/M-04-inconsistent-month-arithmetic.md`.
- **`UserPayment` is the modern delegate.** `execute_payment` /
  `execute_composable` sign as the per-(owner, mint) `UserPayment` PDA; the
  legacy global `PaymentsDelegate` PDA remains accepted but is not written
  for new policies.
- **`PaymentGateway`** gains `feature_flags`, `referral_allocation_bps`,
  `referral_tiers_bps`, `custom_protocol_fee_bps`, and `signer` fields.
- **Fee math**: `gateway_fee_bps + effective_protocol_fee_bps` must be
  strictly `< 10000` (was: `<= 10000`). At exactly 10000 the recipient
  received zero; the new check rejects that config.
- **`min_output_amount`** on `ForwardConfig` is now checked against the
  **net** (post-fee) output, matching DeFi `amountOutMin` convention.

### Security

- **Intermediate ATA ownership decoupled** — intermediate input/output
  ATAs are owned by the `ComposablePolicy` PDA, **not** the `UserPayment`
  PDA. This means a forward program can only ever touch transient
  intermediate balances, never the user's source funds.
- **CPI signer sanitization (C-1)** — validation and forward CPI builders
  no longer forward `is_signer` from `remaining_accounts`. Closes a
  privilege-pass-through vector where the fee payer (a Signer) re-passed as
  a remaining account could grant Lighthouse / DLMM unintended signer
  authority.
- **Allowlists** for forward (`ALLOWED_FORWARD_PROGRAMS` — Meteora DLMM) and
  validation (`ALLOWED_VALIDATION_PROGRAMS` — Lighthouse) target programs.
  Sentinels (`Pubkey::default()` / `SystemProgram`) disable the hooks.
- **`ByteRangeCheck` length unbounded (H-06)** — create-time guard now
  rejects `length > 8`; runtime `validate` also defends against the panic
  for hostile / malformed accounts.
- **Manual `ValidationPda` init freshness check (M-02)** — explicit
  `is_fresh` check against pre-funded or wrong-owner accounts to prevent
  type cosplay and re-initialization.
- **Combined-fee underflow (M5)** — `validate_combined_bps` now runs after
  both fee fields reach their final values, preventing an
  `ArithmeticOverflow` on every payment through misconfigured gateways.

### Removed

- Five dead error variants purged during the ponytail #8 cleanup of
  `error.rs` (post-cleanup variant count: **58**).

## [Pre-release] — Direct Pull Payments

The original program: `PaymentPolicy` (Subscription / Milestone / PayAsYouGo)
with direct gateway pulls, `PaymentGateway`, `UserPayment`, `ProgramConfig`,
and the `transfer` helper.

### Added

- `initialize`, `create_user_payment`, `create_payment_gateway`,
  `create_payment_policy`, `execute_payment`,
  `change_payment_policy_status`, `delete_payment_policy`,
  `delete_user_payment`, `delete_payment_gateway`,
  `change_gateway_signer`, `change_gateway_fee_recipient`,
  `change_gateway_fee_bps`, `transfer`.
- `ProgramConfig` with admin, protocol fee recipient, `protocol_fee_bps`
  (default 100).
- `PaymentGateway` with per-authority fees and signer.
- `PolicyType::Subscription`, `Milestone`, `PayAsYouGo` — fixed 128-byte
  variants.

## Versioning notes

- Tributary does **not** maintain separate program IDs per environment —
  Devnet and Mainnet share `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`.
- Account layouts are padded for forward-compatibility; adding fields
  consumes reserved padding without a state migration. Variants of
  `PolicyType` are pinned at 128 bytes — adding a variant is safe as long
  as the body fits.
- See [Deployment](deployment.md) for how to verify the current on-chain
  build, and [Error Codes](error-codes.md) for the up-to-date error table.
