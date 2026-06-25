# Allowlists & Sentinels

ComposablePolicy ships with **two hard-coded program allowlists** and a pair
of **sentinel conventions** that let a policy disable either hook without
special-cased branches throughout the codebase. This page documents both
and the create-time / execute-time checks that enforce them.

## Allowlists

Defined in `programs/tributary/src/constants.rs`:

```rust
pub const ALLOWED_FORWARD_PROGRAMS: &[Pubkey] =
    &[pubkey!("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo")]; // Meteora DLMM

pub const ALLOWED_VALIDATION_PROGRAMS: &[Pubkey] =
    &[pubkey!("L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95")]; // Lighthouse
```

| Constant                      | Currently contains     | Used by                                    |
| ----------------------------- | ---------------------- | ------------------------------------------ |
| `ALLOWED_FORWARD_PROGRAMS`    | Meteora DLMM (1 entry) | `validate_forward_config`, execute handler |
| `ALLOWED_VALIDATION_PROGRAMS` | Lighthouse (1 entry)   | `create_composable_policy`                 |

Allowlisting exists because both hooks receive `invoke_signed`-style
authority over the ComposablePolicy PDA's intermediate ATAs. An arbitrary
program in either slot could move transient balances to attacker accounts.
Hard-allowlisting caps the blast radius to two well-audited programs whose
instruction semantics Tributary understands (and, in the forward case, pins
via `ByteRangeCheck` discriminator checks — see
[forward-hook.md](forward-hook.md)).

## Sentinel conventions

| Hook       | Disabled when…                                                                                 | Constant            |
| ---------- | ---------------------------------------------------------------------------------------------- | ------------------- |
| Forward    | `forward_config.target_program == Pubkey::default()`                                           | `Pubkey::default()` |
| Validation | `validation_config.validation_program == SystemProgram` (or `Pubkey::default()` via `Default`) | `SystemProgram`     |

The two hooks use **different** sentinel pubkeys. This is intentional: it
mirrors the semantic distinction between "no CPI target at all" (forward,
where the disabled path skips the entire Phase 3) and "no assertion program
needed" (validation, where `SystemProgram` is a harmless no-op CPI target
that the caller can still pass as a real account without special handling).

### Forward-disabled invariants

When `target_program == Pubkey::default()`:

- `num_data_checks == 0` (no forward instruction selector to pin).
- `input_mint == output_mint` (no conversion step — the "same-mint topup"
  pattern. The intermediate is funded by the pull and swept directly).
- Execute handler skips both the byte-range check and `run_forward_cpi`.

### Validation-disabled invariants

When `validation_program == SystemProgram`:

- `validation_data.is_empty()` (no assertion to store).
- No `ValidationPda` account is allocated.
- Execute handler skips Phase 2 entirely and consumes zero
  `remaining_accounts` for validation.

## Create-time checks (`validate_forward_config`)

`create_composable_policy` extracts the forward-leg rules into a
unit-testable helper:

```rust
pub(crate) fn validate_forward_config(forward_config: &ForwardConfig) -> Result<()> {
    let forward_disabled = forward_config.target_program == Pubkey::default();
    require!(
        forward_disabled || ALLOWED_FORWARD_PROGRAMS.contains(&forward_config.target_program),
        TributaryError::InvalidForwardProgram,
    );

    if forward_disabled {
        require!(forward_config.num_data_checks == 0,
                 TributaryError::InsufficientByteRangeChecks);
        require!(forward_config.input_mint == forward_config.output_mint,
                 TributaryError::ForwardDisabledRequiresSameMint);
    } else {
        require!(forward_config.num_data_checks >= 1
                 && forward_config.num_data_checks <= MAX_BYTE_RANGE_CHECKS as u8,
                 TributaryError::InsufficientByteRangeChecks);
    }

    if forward_config.is_native_output() {
        require!(forward_config.output_mint == NATIVE_MINT,
                 TributaryError::NativeOutputRequiresWsol);
    }
    Ok(())
}
```

The validation-program allowlist check and the per-`ByteRangeCheck` sanity
loop (including the discriminator-pin requirement) live in the handler body
itself — see `create_composable_policy.rs`.

The handler also re-pins the named `input_mint` / `output_mint` accounts
against the caller-supplied `forward_config` Pubkeys and runs the full
Token-2022 extension allowlist on both (`validate_mint_compatible`). Without
this, a policy could be created against a `TransferHook` /
`PermanentDelegate` / `ConfidentialTransferMint` mint that breaks
`transfer_checked` at execute time, or drains the PDA-owned intermediate ATA
in the `PermanentDelegate` case (see
`reports/L-02-mint-validation-call-sites-incomplete.md`).

## Execute-time re-validation

The execute handler re-checks several invariants that were already enforced
at create time. The pattern is defense-in-depth: these values are sourced
from on-chain state, so a directly-serialized malformed account (or a
regression in create-time validation) must not be able to trigger a panic
or privilege escalation.

| Re-check                                                                                  | Source report |
| ----------------------------------------------------------------------------------------- | ------------- |
| `validate_mint_compatible(input_mint)` AND `(output_mint)` (Token-2022 extensions mutate) | L-02          |
| `n <= checks.len()` before indexing `data_checks[i]`                                      | H-04          |
| `ByteRangeCheck::validate` rejects `length > 8` rather than panicking                     | H-06          |
| `validation_program == stored_validation_program`                                         | C-1           |
| `forward_config.target_program` allowlist (transitively, via stored state)                | —             |

## Emergency pause

`ProgramConfig.emergency_pause` is a global kill switch. The execute
handler's `config` account carries:

```rust
#[account(
    seeds = [CONFIG_SEED],
    bump = config.bump,
    constraint = !config.emergency_pause,
)]
pub config: Box<Account<'info, ProgramConfig>>,
```

When the pause flag is true, **every** `execute_composable` (and
`execute_payment`) call fails the constraint at the top of the handler,
before any state is read or any CPI is attempted. Create is also blocked
via the same flag on `CreateComposablePolicy::config`.

The flag is intended for incident response — e.g. an unresolved vulability
in an allowlisted forward program. It does **not** freeze existing policy
state; recipients and users retain full custody, and the flag can be
cleared to resume execution.
