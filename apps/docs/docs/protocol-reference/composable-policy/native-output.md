# Native Output (`FORWARD_FLAG_NATIVE_OUTPUT`)

Bit 0 of `ForwardConfig.forward_flags` selects the **native-output** sweep
mode. When set, the post-swap settlement step unwraps the WSOL intermediate
into native SOL via `closeAccount`, instead of sweeping WSOL into the
recipient's WSOL ATA.

```
FORWARD_FLAG_NATIVE_OUTPUT: u8 = 1;   // constants.rs

NATIVE_MINT: Pubkey = "So11111111111111111111111111111111111111112";
```

## When to use

Use native-output when the **recipient wants native SOL**, not WSOL. Common
cases:

- A wallet that does not maintain a WSOL ATA and prefers SOL directly.
- A hot-wallet topup flow that pays gas in SOL.
- Recipient is a smart contract / program that consumes lamports, not
  SPL-token balances.

Without this flag, the recipient receives WSOL and must separately unwrap
it (`createAccount` + `closeAccount`) to spend it as gas.

## Create-time guard

`validate_forward_config` enforces:

```rust
if forward_config.is_native_output() {
    require!(
        forward_config.output_mint == NATIVE_MINT,
        TributaryError::NativeOutputRequiresWsol,
    );
}
```

Auto-unwrapping any `output_mint` other than WSOL would `closeAccount` an
unrelated token account — the guard makes the invariant explicit.

## Execution difference

In normal mode the post-swap sweep is a `transfer_checked`:

```
intermediate_output_ata (WSOL)
   │ transfer_checked(sweep_amount)
   ▼
recipient_token_account (recipient's WSOL ATA)
```

In native-output mode the sweep is a `closeAccount`:

```
intermediate_output_ata (WSOL, owned by ComposablePolicy PDA)
   │ closeAccount
   │   authority   = ComposablePolicy PDA
   │   destination = recipient_token_account  (== recipient's SYSTEM wallet)
   ▼
recipient_token_account (recipient's system account, native SOL)
   ↑ receives sweep_amount lamports (the WSOL value)
   ↑ PLUS the closed ATA's rent lamports (side-effect bonus)
```

Source: `process_output_and_sweep` in `execute_composable.rs`.

Fees are still taken in **WSOL** via `transfer_checked` into the gateway and
protocol fee accounts _before_ the `closeAccount` fires. The
`sweep_amount` returned for accounting is the WSOL value unwrapped; the rent
bonus shipped by `closeAccount` is excluded from `composable_policy.total_output`.

## Recipient validation

The `recipient_token_account` argument has dual meaning:

| Mode          | What it must be                                                                    |
| ------------- | ---------------------------------------------------------------------------------- |
| Normal        | The recipient's `output_mint` ATA (`mint == output_mint` AND `owner == recipient`) |
| Native-output | The recipient's **system wallet** (`key == composable_policy.recipient`)           |

Anchor constraints are static, so `recipient_token_account` is declared as
`UncheckedAccount` and the handler replicates the two normal-mode checks
(mint at bytes `0..32`, owner at bytes `32..64` of the SPL Token layout)
inline. In native-output mode the handler asserts:

```rust
require!(
    ctx.accounts.recipient_token_account.key()
        == ctx.accounts.composable_policy.recipient,
    TributaryError::Unauthorized,
);
```

## Security — destination pinned on-chain

The `closeAccount` `destination` is constrained on-chain to equal
`composable_policy.recipient`. There is no drain vector: a gateway cannot
redirect the unwrap to itself, because the handler (not the caller) chooses
the destination and validates it against stored policy state.

The rejected alternative — a generic Token/wrap forward program that
performed the unwrap itself — would have let the gateway redirect
`closeAccount`'s `destination` to its own wallet. Pinning the destination in
the Tributary handler closes that vector. See `reports/native-output-sweep.md`
and bean `tributary-hgp7` for the full write-up.

## Post-sweep cleanup

`closeAccount` zeroes the WSOL intermediate, so the handler's
"verify intermediates empty" step skips the output-side check when
`native_output` is true:

```rust
if !native_output {
    let output_check = read_token_amount(&intermediate_output_ata)?;
    require!(output_check == 0, TributaryError::InsufficientBalance);
}
```

Similarly, the final intermediate-close loop skips re-closing the output
intermediate (it no longer exists). The input intermediate is still closed
normally to return rent to the fee payer.
