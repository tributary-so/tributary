# Forward Hook

The **forward hook** is an opt-in token-transform CPI that runs **after** the
validation hook (Phase 2) and **before** settlement (Phase 4). It lets a
policy pull one token from the user and deliver a different token to the
recipient — e.g. pull USDC, swap to WSOL via Meteora DLMM, then settle in
WSOL (or native SOL — see [native-output.md](native-output.md)).

The currently allowlisted forward targets are **Meteora DLMM**, **Raydium
CPMM**, **Raydium CLMM**, and **Orca Whirlpool** (see
[allowlists-and-sentinels.md](allowlists-and-sentinels.md) and ADR-0032 for
the Raydium CPMM addition).

## ForwardConfig (on-policy)

Stored inline on the `ComposablePolicy` account:

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub struct ForwardConfig {
    /// Unified instruction constraint — pins the forward program, its
    /// instruction selector, and indexed accounts. Absorbs the old
    /// `target_program` + `data_checks` fields and the scrapped
    /// `ForwardAccountsPda` design.
    /// `instruction_constraint.program_id == Pubkey::default()` is the
    /// "forward disabled" sentinel.
    pub instruction_constraint: InstructionConstraint,

    /// == user_payment.token_mint. Validated at execute time against the
    /// user_token_account mint.
    pub input_mint: Pubkey,

    /// Recipient delivery mint. May equal input_mint only when forward is
    /// disabled (same-mint topup path). `Pubkey::default()` + forward
    /// enabled = **act mode** (ADR-0026).
    pub output_mint: Pubkey,

    /// Bit 0 = FORWARD_FLAG_NATIVE_OUTPUT (see native-output.md).
    pub forward_flags: u8,
}

impl ForwardConfig {
    pub const SIZE: usize = InstructionConstraint::SIZE + // instruction_constraint
        32 + // input_mint
        32 + // output_mint
        1;   // forward_flags = 205 bytes
}
```

Source: `programs/tributary/src/state/composable_policy.rs`.

## InstructionConstraint — unified forward guard

Replaces the v1.0 flat `target_program` + `ByteRangeCheck[]` model. Wraps
the forward-program target, its instruction-selector byte-range checks,
and its positional account pins into one struct. At create time
`program_id == Pubkey::default()` ≡ forward disabled.

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub struct InstructionConstraint {
    /// CPI target. `Pubkey::default()` is the forward-disabled sentinel.
    pub program_id: Pubkey,
    pub num_data_checks: u8,
    pub data_checks: [ByteRangeCheck; 4],
    pub num_pinned_accounts: u8,
    /// Indexed pins: `pinned_accounts[i]` constrains the account at
    /// `remaining_accounts[forward_start + pinned_accounts[i].index]` to
    /// equal `pinned_accounts[i].pubkey`.
    pub pinned_accounts: [PinnedAccount; 2],
}

impl InstructionConstraint {
    pub const SIZE: usize = 140; // = 32 + 1 + (1+1+8)*4 + 1 + (1+32)*2
}
```

## PinnedAccount — indexed forward-account pin

Replaces the old positional `[Pubkey; 4]` array. Each pin independently
declares which `remaining_accounts` slot it constrains, so account
insertions in the forward program's account list do not shift every pin.

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Default)]
pub struct PinnedAccount {
    pub index: u8,
    pub pubkey: Pubkey,
}
```

## ByteRangeCheck — pinning the forward instruction

Each `ByteRangeCheck` asserts that a contiguous slice of the caller-supplied
`instruction_data` equals a stored constant. The check that matters most is
the **discriminator pin** — a check at `offset == 0` that fixes the first
bytes of the forward program's instruction selector. Without this, a gateway
signer could swap an arbitrary instruction (e.g. a Token `transfer` to
itself) into the forward slot.

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub struct ByteRangeCheck {
    pub offset: u8,
    pub length: u8,           // MUST be <= 8 (validated at create + execute)
    pub expected: [u8; 8],    // only the first `length` bytes are compared
}

impl ByteRangeCheck {
    pub fn validate(&self, instruction_data: &[u8]) -> bool {
        if self.length > 8 { return false; }
        if self.offset as usize + self.length as usize > instruction_data.len() {
            return false;
        }
        let start = self.offset as usize;
        let end   = start + self.length as usize;
        instruction_data[start..end] == self.expected[..self.length as usize]
    }
}
```

!!! info "SDK representation"

    In the Rust program `expected` is `[u8; 8]`. In the TypeScript SDK
    (resolved from the Anchor IDL) the same field is typed as `Buffer`.
    The first `length` bytes are compared; trailing bytes are ignored in
    both representations.

### Create-time rules

`validate_forward_config` and the create handler enforce:

| Rule                                                                              | Error                             |
| --------------------------------------------------------------------------------- | --------------------------------- |
| `instruction_constraint.program_id == Pubkey::default()` ⟹ `num_data_checks == 0` | `InsufficientByteRangeChecks`     |
| forward disabled ⟹ `input_mint == output_mint`                                    | `ForwardDisabledRequiresSameMint` |
| `instruction_constraint.program_id` in `ALLOWED_FORWARD_PROGRAMS`                 | `InvalidForwardProgram`           |
| forward enabled ⟹ `1 <= instruction_constraint.num_data_checks <= 4`              | `InsufficientByteRangeChecks`     |
| forward enabled ⟹ `instruction_constraint.num_pinned_accounts <= 2`               | `InsufficientPinnedAccounts`      |
| **forward enabled ⟹ `has_effective_pins()` (≥ 1 non-default pin)**                | `DegenerateForwardPins`           |
| no duplicate indices among active `pinned_accounts`                               | `DuplicatePinIndex`               |
| for each active check: `offset + length <= 1024`                                  | `ByteRangeCheckFailed`            |
| for each active check: `length <= 8`                                              | `ByteRangeCheckFailed`            |
| at least one check with `offset == 0 && length > 0`                               | `DiscriminatorCheckRequired`      |
| `forward_flags & FORWARD_FLAG_NATIVE_OUTPUT` ⟹ `output_mint == NATIVE_MINT`       | `NativeOutputRequiresWsol`        |

The **degenerate-pin guard** rejects a forward-enabled constraint with
zero effective pins. Without it, a gateway could swap in an arbitrary
remaining-account at the forward slot — the pin set is what binds the
forward CPI to a specific account layout (see CF-001,
[security-model.md](security-model.md)).

### `output_mint` — three settlement shapes

The combination of `output_mint` and whether forward is enabled selects
one of three settlement shapes (ADR-0026, see also
[overview.md](overview.md) Phase 5):

| `output_mint`            | Forward  | Shape                    | Behaviour                                                                                           |
| ------------------------ | -------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| `== input_mint`          | disabled | **deliver-no-transform** | Intermediate input swept directly to recipient. No swap.                                            |
| concrete mint `!= input` | enabled  | **deliver-transform**    | Forward swaps input → output; output swept; `>0` guard KEPT.                                        |
| `Pubkey::default()`      | enabled  | **act mode**             | Forward consumes input for non-fungible settlement. No output ATA, no deliver sweep, no `>0` guard. |

### Execute-time re-validation

Even though create-time validation rejects malformed configs, the handler
re-runs both checks with values sourced from on-chain state:

1. **Byte-range check**: `validate_byte_ranges` re-checks
   `n <= MAX_BYTE_RANGE_CHECKS` and `n <= checks.len()` before indexing
   (H-04 defense-in-depth — a directly-serialised malformed account must
   not trigger an indexed panic).

2. **Pinned-account check**: the handler calls
   `instruction_constraint.pins_match(remaining_accounts, forward_start)`
   to verify that every active pin's
   `remaining_accounts[forward_start + pin.index]` equals `pin.pubkey`.

## Output floor — post-validation replaces `min_output_amount`

`min_output_amount` was removed from `ForwardConfig` in v2.1. The semantic
replacement is **post-validation**: a `ValidationSpec::ProgramCall` CPI
(Lighthouse) that runs **after** the forward step and before settlement.
The owner writes a Lighthouse assertion that enforces the minimum output
amount — for example `"recipient_token_account.amount >= 1_000_000"` after
the forward CPI has deposited tokens there.

This generalises the v1.0 `min_output_amount` concept: the assertion can
check any on-chain state, not just a number-of-tokens threshold. See
[validation-hook.md](validation-hook.md) for the full post-validation
mechanics and assertion-building reference.

!!! note "Deliver-transform output-floor guard"

    In deliver-transform mode the program still asserts
    `output_amount > 0` — Tributary confirms the forward program **ran**.
    The **amount** floor (`amount >= N`) is pure post-validation; the
    `> 0` guard is an existence assertion, not a pricing assertion.

## Forward CPI mechanics

`run_forward_cpi` builds the forward instruction from the caller-supplied
`remaining_accounts`:

```
remaining_accounts layout:
┌────────────────────────────────────────────────────────────────────────┐
│ validation targets (pre)      — consumed by pre-validation CPI        │
├────────────────────────────────────────────────────────────────────────┤
│ forward-program accounts      — forwarded to Meteora DLMM etc.        │
│ pinned_accounts check:                                                │
│   remaining_mid[fwd_base + pin.index] == pin.pubkey for each pin      │
│ (Base index fwd_base = after pre-validation targets.)                 │
├────────────────────────────────────────────────────────────────────────┤
│ validation targets (post)     — consumed by post-validation CPI       │
└────────────────────────────────────────────────────────────────────────┘
```

Forward accounts are forwarded verbatim — including executable accounts
(see the H-04 comment in `run_forward_cpi` explaining why executables are
NOT stripped). The CPI is invoked with `invoke_signed` using only the
ComposablePolicy PDA seeds:

```rust
let instruction = Instruction {
    program_id: target_program,
    accounts: build_forward_account_metas(&infos, intermediate_owner_pda),
    data: instruction_data.to_vec(),
};
invoke_signed(&instruction, &all_forward_infos, &[intermediate_owner_seeds])?;
```

`build_forward_account_metas` forces `is_signer: true` **only** for the
ComposablePolicy PDA itself; every other forwarded account is
`is_signer: false`, even if the caller passed it as a signer in the outer
transaction. `is_writable` is forwarded verbatim — the Solana runtime
rejects any inner instruction claiming writable access the outer transaction
did not also mark writable, so this cannot elevate privileges.

See [security-model.md](security-model.md) for why the ComposablePolicy PDA
is the only signer and why this bounds the forward program's blast radius to
the transient intermediate balances.

## Disabling forward

Set `instruction_constraint.program_id = Pubkey::default()` at create time
(or pass `InstructionConstraint::default()`). The handler detects this
sentinel and:

- Skips the byte-range check and pinned-account check.
- Skips `run_forward_cpi` entirely.
- Uses the same-mint topup path: input and output intermediates collapse
  into one account; the face balance is swept directly to the recipient.

This is the "auto topup" pattern — pull USDC, deliver USDC, no swap. See
[allowlists-and-sentinels.md](allowlists-and-sentinels.md).
