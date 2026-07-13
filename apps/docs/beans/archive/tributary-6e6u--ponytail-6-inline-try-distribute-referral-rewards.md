---
# tributary-6e6u
title: "Ponytail #6: inline try_distribute_referral_rewards wrapper"
status: completed
type: task
priority: normal
tags:
  - ponytail
  - shrink
created_at: 2026-06-24T12:38:21Z
updated_at: 2026-06-25T06:41:24Z
parent: tributary-9hca
---

`shared/referral.rs:236-277` (`try_distribute_referral_rewards`) is a 42-LOC, 15-argument wrapper that builds a `ReferralContext` and calls `process_referral_rewards`. It exists only to centralize the `is_referral_enabled() && referral_allocation_bps != 0` short-circuit. But `process_referral_rewards` already short-circuits on `referral_pool == 0` (line 146-148) and on empty `remaining_accounts` (line 151-153).

Two callers: `execute_payment::handler` and `transfer::handler`. Each builds the 15-arg call by hand.

## Why it is a shrink

- The wrapper saves the caller exactly one if-check: `if !gateway.is_referral_enabled() || gateway.referral_allocation_bps == 0 { return Ok(0); }`.
- Everything else is plumbing that the caller already has in scope.
- Net: callers see the same args whether they call the wrapper or `process_referral_rewards` directly.

## Cut

Option A (minimal): keep `try_distribute_referral_rewards` but drop the `ReferralContext` struct — pass the args directly to `process_referral_rewards`. Removes the struct + its construction.

Option B (preferred): delete the wrapper entirely. Move the disabled-check into the first two lines of `process_referral_rewards`:

```rust
pub fn process_referral_rewards<'a, 'info>(
    gateway: &PaymentGateway,
    gateway_fee: u64,
    remaining_accounts: &'info [AccountInfo<'info>],
    // ...other args
) -> Result<u64> {
    if !gateway.is_referral_enabled() || gateway.referral_allocation_bps == 0 {
        return Ok(0);
    }
    // ...rest of existing body
}
```

Callers lose the wrapper import and call `process_referral_rewards` directly.

- [x] Decide Option A vs B (B is cleaner)
- [x] If B: inline `gateway: &PaymentGateway` as the first param of `process_referral_rewards`; delete `try_distribute_referral_rewards` + `ReferralContext` struct
- [x] Update `execute_payment::handler` + `transfer::handler` callers
- [x] `cargo test --lib`

## Verification

- Existing referral tests pass unchanged (they target `validate_referral_chain_topology`, not the wrapper)

## Risk

Low. The wrapper has no test coverage of its own — only its callee does.

## Files

- `programs/tributary/src/shared/referral.rs` (delete wrapper + struct, or shrink)
- `programs/tributary/src/instructions/payment/execute_payment.rs` (caller update)
- `programs/tributary/src/instructions/payment/transfer.rs` (caller update)

## Summary of Changes

- Deleted `try_distribute_referral_rewards` wrapper (~42 LOC).
- Deleted `ReferralContext` struct (~17 LOC).
- Moved the disabled-check (`!gateway.is_referral_enabled() || gateway.referral_allocation_bps == 0`) into the first lines of `process_referral_rewards`.
- `process_referral_rewards` now takes `gateway: &PaymentGateway` directly and reads `referral_allocation_bps` / `referral_tiers_bps` off it (dropped those args).
- `transfer_referral_reward` lost its `&ReferralContext` param; the 6 needed `AccountInfo`/`AuthorityMode` fields are now passed by reference.
- Updated callers in `execute_payment::handler` and `transfer::handler` to call `process_referral_rewards` directly.
- `cargo check` clean; `cargo test --lib` reports 60 passed / 0 failed.
- Net delta in `shared/referral.rs`: -42 LOC (61 added, 103 removed across the whole file).
