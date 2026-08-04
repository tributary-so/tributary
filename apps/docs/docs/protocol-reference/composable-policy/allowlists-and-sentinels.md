# Allowlists & Sentinels

ComposablePolicy ships with **two hard-coded program allowlists** and a pair
of **sentinel conventions** that let a policy disable either hook without
special-cased branches throughout the codebase. This page documents both
and the create-time / execute-time checks that enforce them.

## Allowlists

Defined in `programs/tributary/src/constants.rs`:

```rust
pub const ALLOWED_FORWARD_PROGRAMS: &[Pubkey] = &[
    pubkey!("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"), // Meteora DLMM
    pubkey!("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C"), // Raydium CPMM
    pubkey!("CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"), // Raydium CLMM
    pubkey!("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"), // Orca Whirlpool
];

pub const ALLOWED_VALIDATION_PROGRAMS: &[Pubkey] =
    &[pubkey!("L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95")]; // Lighthouse
```

| Constant                      | Currently contains                                                   | Used by                                    |
| ----------------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| `ALLOWED_FORWARD_PROGRAMS`    | Meteora DLMM, Raydium CPMM, Raydium CLMM, Orca Whirlpool (4 entries) | `validate_forward_config`, execute handler |
| `ALLOWED_VALIDATION_PROGRAMS` | Lighthouse (1 entry)                                                 | `create_composable_policy`                 |

Allowlisting exists because the **forward** hook receives `invoke_signed`
authority over the ComposablePolicy PDA's intermediate ATAs — an arbitrary
program in that slot could move transient balances to attacker accounts.
Hard-allowlisting caps the blast radius to four well-audited DEX programs
whose instruction semantics Tributary pins via `ByteRangeCheck`
discriminator checks (see [forward-hook.md](forward-hook.md)).

The **validation** hook is read-only and uses plain `invoke` with **no**
signer seeds (C-1 fix, [security-model.md](security-model.md) §CPI signer
sanitization) — so the validation allowlist is defense-in-depth rather
than a privilege boundary. Lighthouse is the only entry.

## Sentinel conventions

| Hook / shape          | Disabled / activated when…                                                | Sentinel            |
| --------------------- | ------------------------------------------------------------------------- | ------------------- |
| Forward               | `instruction_constraint.program_id == Pubkey::default()`                  | `Pubkey::default()` |
| Validation (pre/post) | `ValidationSpec::Disabled`                                                | enum variant        |
| **Act mode**          | forward **enabled** AND `forward_config.output_mint == Pubkey::default()` | `Pubkey::default()` |

The two hooks use **different** sentinel conventions. Forward uses a
pubkey sentinel (`Pubkey::default()` on `instruction_constraint.program_id`)
since program ID is the single gate. Validation uses an enum variant
(`ValidationSpec::Disabled`) because the spec carries no pubkey — when
disabled no assertion data is stored, no `ValidationPda` is allocated, and
the caller passes `SystemProgram` as the program account.

A third sentinel — `output_mint == Pubkey::default()` **with forward
enabled** — selects **act mode** (ADR-0026): the forward CPI consumes the
input for non-fungible settlement (e.g. a Velocity subaccount deposit).
No output ATA is created, no deliver sweep runs, and the `>0` output guard
is skipped. This is distinct from forward-disabled same-mint topup
(`output_mint == input_mint`), which is deliver-no-transform.

### Forward-disabled invariants

When `instruction_constraint.program_id == Pubkey::default()`:

- `ic.num_data_checks == 0` (no forward instruction selector to pin).
- `output_mint == input_mint` (no conversion step — the "same-mint topup"
  pattern. The intermediate is funded by the pull and swept directly).
- Execute handler skips both the byte-range check and `run_forward_cpi`.

### Validation-disabled invariants

When the spec is `ValidationSpec::Disabled`:

- `validation_data.is_empty()` (no assertion to store — enforced by
  `validate_init` at create time).
- No `ValidationPda` account is allocated (neither pre nor post).
- Execute handler skips Phase 2 (pre-validation) and Phase 4
  (post-validation) entirely; it consumes zero `remaining_accounts`
  for validation, and the caller passes `SystemProgram` as the
  program account.

## Create-time checks

### Forward config (`validate_forward_config`)

The forward-leg rules are extracted into a unit-testable helper. The current
function reads `num_data_checks` and `program_id` through the nested
`instruction_constraint`:

```rust
pub fn validate_forward_config(forward_config: &ForwardConfig) -> Result<()> {
    let ic = &forward_config.instruction_constraint;
    let forward_disabled = ic.is_disabled();

    require!(
        forward_disabled || ALLOWED_FORWARD_PROGRAMS.contains(&ic.program_id),
        TributaryError::InvalidForwardProgram
    );

    if forward_disabled {
        require!(ic.num_data_checks == 0,
                 TributaryError::InsufficientByteRangeChecks);
        require!(forward_config.output_mint == forward_config.input_mint,
                 TributaryError::ForwardDisabledRequiresSameMint);
    } else {
        require!(ic.num_data_checks >= 1
                 && ic.num_data_checks <= MAX_BYTE_RANGE_CHECKS as u8,
                 TributaryError::InsufficientByteRangeChecks);
        require!(ic.has_effective_pins(),
                 TributaryError::DegenerateForwardPins);
        require!(!ic.has_duplicate_indices(),
                 TributaryError::DuplicatePinIndex);
    }

    if forward_config.is_native_output() {
        require!(forward_config.output_mint == NATIVE_MINT,
                 TributaryError::NativeOutputRequiresWsol);
    }
    Ok(())
}
```

The per-`ByteRangeCheck` sanity loop (including the discriminator-pin
requirement for offset 0) lives in the handler body itself, iterating
`forward_config.instruction_constraint.data_checks[i]` — see
`create_composable_policy.rs`.

### Validation specs (`validate_spec_and_program` + `validate_init`)

Validation is now handled per-slot (pre and post) through the `ValidationSpec`
enum. At create time the handler calls:

```rust
// Resolve each spec against the caller-supplied program account.
validate_spec_and_program(pre_validation,
    ctx.accounts.pre_validation_program.key(),
    ctx.accounts.system_program.key())?;
validate_spec_and_program(post_validation,
    ctx.accounts.post_validation_program.key(),
    ctx.accounts.system_program.key())?;

// Then validate the init data for each (assertion bytes, pin set).
validate_init(&pre_validation, &pre_init)?;
validate_init(&post_validation, &post_init)?;
```

Where `validate_spec_and_program` dispatches on the enum:

- `ValidationSpec::Disabled` → the passed program account must be
  `SystemProgram` (no CPI target needed). No `ValidationPda` is allocated.
- `ValidationSpec::ProgramCall { program_id }` → the passed program must
  match `program_id`, which must be in `ALLOWED_VALIDATION_PROGRAMS`.
- `ValidationSpec::Inline { .. }` → returns `InlineValidationNotImplemented`.

And `validate_init` ensures:

- When `Disabled`: `validation_data` must be empty (no assertion to store).
- When `ProgramCall`: `validation_data` must be non-empty and ≤ 512 bytes
  (`MAX_VALIDATION_DATA_SIZE`), pins must be non-default, indices unique,
  within bounds.

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

| Re-check                                                                                      | Source report |
| --------------------------------------------------------------------------------------------- | ------------- |
| `validate_mint_compatible(input_mint)` AND `(output_mint)` (Token-2022 extensions mutate)     | L-02          |
| `n <= checks.len()` before indexing `data_checks[i]`                                          | H-04          |
| `ByteRangeCheck::validate` rejects `length > 8` rather than panicking                         | H-06          |
| `pre_validation.program_id() == pre_program_info.key()` (+ same for post)                     | C-1           |
| `forward_config.instruction_constraint.program_id` allowlist (transitively, via stored state) | —             |

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
