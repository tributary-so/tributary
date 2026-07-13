---
# tributary-s672
title: "Ponytail #14: shrink process_output_and_sweep 17-arg signature"
status: completed
type: task
priority: low
tags:
  - ponytail
  - shrink
created_at: 2026-06-24T12:39:51Z
updated_at: 2026-06-25T06:57:27Z
parent: tributary-9hca
---

`instructions/composable/execute_composable.rs:340-363` — `process_output_and_sweep` takes 17 parameters. Five of them (`gateway_fee_bps`, `use_custom_protocol_fee`, `custom_protocol_fee_bps`, `default_protocol_fee_bps`, `is_amount_net`) come from exactly two sources: `&PaymentGateway` and `&ProgramConfig`.

## Cut

Pass `gateway: &PaymentGateway` and `config: &ProgramConfig` instead of unpacking the five derived scalars at the call site. The function can call `crate::shared::fees::calculate_fees(output_amount, gateway.gateway_fee_bps, gateway.custom_protocol_fee_bps, config.protocol_fee_bps, gateway.is_custom_protocol_fee_enabled(), gateway.is_amount_net())` internally.

```rust
fn process_output_and_sweep<'info>(
    intermediate_output: &AccountInfo<'info>,
    output_mint: &AccountInfo<'info>,
    output_mint_decimals: u8,
    intermediate_owner_info: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    gateway: &PaymentGateway,
    config: &ProgramConfig,
    gateway_fee_account: &AccountInfo<'info>,
    protocol_fee_account: &AccountInfo<'info>,
    recipient_token_account: &AccountInfo<'info>,
    min_output_amount: Option<u64>,
    intermediate_owner_seeds: &[&[&[u8]]],
    native_output: bool,
) -> Result<(u64, u64, u64, u64)> { ... }
```

13 args, all of which are either single account infos or already-required context. The fee math is now the gateway+config's responsibility — same pattern as `execute_payment::handler`.

## Verification

- `cargo test --lib` + `anchor test`
- Net delta: -5 args at the call site, the helper body adds 2 lines (the helper call).

## Risk

Low. Mechanical change.

## Files

- `programs/tributary/src/instructions/composable/execute_composable.rs:340-363` (signature)
- `programs/tributary/src/instructions/composable/execute_composable.rs:983-1002` (call site)

## Summary of Changes

- `process_output_and_sweep` signature shrunk from 17 args to 13 args.
- Replaced 5 scalar fee params (`gateway_fee_bps`, `use_custom_protocol_fee`, `custom_protocol_fee_bps`, `default_protocol_fee_bps`, `is_amount_net`) with `gateway: &PaymentGateway` and `config: &ProgramConfig`.
- The function now reads fee fields off the structs directly when calling `shared::fees::calculate_fees` (auto-deref coercion at the call site turns `&Box<Account<PaymentGateway>>` into `&PaymentGateway`).
- Dropped `#[allow(clippy::too_many_arguments)]` (13 args is under threshold; `cargo check` clean, no clippy warning surfaced).
- `cargo check` clean; `cargo test --lib` 64 passed / 0 failed.
- Net delta: -5 args at the call site, body unchanged in behavior.
