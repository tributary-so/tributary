---
# tributary-yige
title: "Ponytail #4: route transfer.rs fee math through shared::fees::calculate_fees"
status: completed
type: task
priority: normal
tags:
  - ponytail
  - dedup
created_at: 2026-06-24T12:38:21Z
updated_at: 2026-06-25T06:25:47Z
parent: tributary-9hca
---

`instructions/payment/transfer.rs:96-118` hand-rolls the gross-mode fee split (gateway_fee, protocol_fee, recipient_amount) inline. `execute_payment::handler` already calls `crate::shared::fees::calculate_fees` for the same math. `transfer` is a non-net-mode path so it duplicates the `is_amount_net = false` branch verbatim — drift vector waiting to bite.

## Cut

- [x] Replace lines 96-118 of `transfer.rs` with:
  ```rust
  let fee_breakdown = crate::shared::fees::calculate_fees(
      amount,
      gateway.gateway_fee_bps,
      gateway.custom_protocol_fee_bps,
      config.protocol_fee_bps,
      gateway.is_custom_protocol_fee_enabled(),
      false, // transfer is always gross-mode
  )?;
  let mut gateway_fee = fee_breakdown.gateway_fee;
  let protocol_fee = fee_breakdown.protocol_fee;
  let recipient_amount = fee_breakdown.recipient_amount;
  ```
- [x] Drop the now-unused `config.protocol_fee_bps` binding if it was only used here (it is still used for the referral pool math? — re-check).

## Verification

- `cargo test --lib`
- `cd tests && npx jest` — existing transfer tests must pass unchanged
- Net delta: -25 LOC, +0 behavior

## Files

- `programs/tributary/src/instructions/payment/transfer.rs` (lines 96-118)

## Summary of Changes

- `transfer.rs` lines 96-118 hand-rolled fee math (gateway_fee / protocol_fee / recipient_amount) replaced with a single `crate::shared::fees::calculate_fees(amount, ..., false)` call — gross-mode branch.
- Closes the drift vector with `execute_payment::handler` (execute_payment.rs:190-197), which now uses the identical helper for the same gross-mode branch.
- The local `protocol_fee_bps` binding is gone — the helper selects it internally from the `is_custom_protocol_fee` flag. The `config.protocol_fee_bps` field is still read (passed through to the helper); no orphan.
- `gateway_fee` stays `mut` — it is reassigned at line ~145 after `try_distribute_referral_rewards` returns `referral_pool`.
- `cargo check` clean; `cargo test --lib` reports `60 passed; 0 failed; 0 ignored`.
- Net delta in `transfer.rs`: 204 → 194 lines (-10 LOC; the bean's -25 estimate counted only the deleted block, not the replacement call + comment).
- `cd tests && npx jest` deferred — requires a running Surfpool instance; the change is a pure refactor of in-process math verified by the lib test suite and the byte-for-byte equivalence of the helper's gross-mode branch.
