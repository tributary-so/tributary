# Forward Hook

The **forward hook** is an opt-in token-transform CPI that runs **after** the
validation hook (Phase 2) and **before** settlement (Phase 4). It lets a
policy pull one token from the user and deliver a different token to the
recipient — e.g. pull USDC, swap to WSOL via Meteora DLMM, then settle in
WSOL (or native SOL — see [native-output.md](native-output.md)).

The only forward target currently allowlisted is **Meteora DLMM**
(`LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`).

## ForwardConfig (on-policy)

Stored inline on the `ComposablePolicy` account:

```rust
pub const MAX_BYTE_RANGE_CHECKS: usize = 4;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub struct ForwardConfig {
    /// CPI target. `Pubkey::default()` is the "forward disabled" sentinel
    /// (see allowlists-and-sentinels.md). Otherwise must be in
    /// ALLOWED_FORWARD_PROGRAMS.
    pub target_program: Pubkey,

    /// == user_payment.token_mint. Validated at execute time against the
    /// user_token_account mint.
    pub input_mint: Pubkey,

    /// Recipient delivery mint. May equal input_mint only when forward is
    /// disabled (same-mint topup path).
    pub output_mint: Pubkey,

    /// Minimum acceptable **net** output the recipient must receive,
    /// measured AFTER gateway and protocol fees have been deducted from
    /// the forward program's gross output. Matches DeFi convention
    /// (Uniswap/Jupiter `amountOutMin`). `None` or `Some(0)` disables.
    pub min_output_amount: Option<u64>,

    /// Bit 0 = FORWARD_FLAG_NATIVE_OUTPUT (see native-output.md).
    pub forward_flags: u8,

    /// Number of entries in `data_checks` that are active. Must be in
    /// 1..=MAX_BYTE_RANGE_CHECKS when forward is enabled; must be 0 when
    /// disabled. At least one check MUST pin offset 0 (the discriminator).
    pub num_data_checks: u8,

    pub data_checks: [ByteRangeCheck; MAX_BYTE_RANGE_CHECKS],
}

impl ForwardConfig {
    pub const SIZE: usize = 32 + 32 + 32 + 9 + 1 + 1 + (1 + 1 + 8) * 4; // = 146
}
```

Source: `programs/tributary/src/state/composable_policy.rs`.

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
        // Defense-in-depth: `expected` is a fixed [u8; 8], so a length > 8
        // would panic on the slice below. Reject rather than panic.
        if self.length > 8 { return false; }
        if self.offset as usize + self.length as usize > instruction_data.len() {
            return false;
        }
        let start = self.offset as usize;
        let end   = start + self.length as usize;
        &instruction_data[start..end] == &self.expected[..self.length as usize]
    }
}
```

### Create-time rules

`validate_forward_config` and the create handler enforce:

| Rule                                                                        | Error                             |
| --------------------------------------------------------------------------- | --------------------------------- |
| `target_program == Pubkey::default()` ⟹ `num_data_checks == 0`              | `InsufficientByteRangeChecks`     |
| `target_program == Pubkey::default()` ⟹ `input_mint == output_mint`         | `ForwardDisabledRequiresSameMint` |
| `target_program` in `ALLOWED_FORWARD_PROGRAMS`                              | `InvalidForwardProgram`           |
| forward enabled ⟹ `1 <= num_data_checks <= MAX_BYTE_RANGE_CHECKS`           | `InsufficientByteRangeChecks`     |
| for each active check: `offset + length <= 1024`                            | `ByteRangeCheckFailed`            |
| for each active check: `length <= 8`                                        | `ByteRangeCheckFailed`            |
| at least one check with `offset == 0 && length > 0`                         | `DiscriminatorCheckRequired`      |
| `forward_flags & FORWARD_FLAG_NATIVE_OUTPUT` ⟹ `output_mint == NATIVE_MINT` | `NativeOutputRequiresWsol`        |

### Execute-time re-validation

Even though create-time validation rejects malformed checks, the handler
re-runs `validate_byte_ranges` with `num_checks` sourced from on-chain state
(H-04 defense-in-depth: a directly-serialized malformed account must not
trigger an indexed panic). The loop re-checks
`n <= checks.len()` before indexing.

## min_output_amount — net (post-fee) semantics

`min_output_amount` is checked **after** fees are deducted from the forward
program's gross output:

```rust
let fee_breakdown = shared::fees::calculate_fees(
    output_amount,                               // gross forward output
    gateway.gateway_fee_bps,
    gateway.custom_protocol_fee_bps,
    config.protocol_fee_bps,
    gateway.is_custom_protocol_fee_enabled(),
    gateway.is_amount_net(),
)?;
let sweep_amount = output_amount - gateway_fee - protocol_fee;

if let Some(min_output) = min_output_amount {
    if min_output > 0 {
        require!(sweep_amount >= min_output, InsufficientOutputAmount);
    }
}
```

This matches the DeFi convention (Uniswap / Jupiter `amountOutMin`): the
caller reasons about the **net** number of output tokens that will land in
the recipient's account. Set to `None` or `Some(0)` to disable the check
entirely.

Rationale: `reports/M5-min-output-amount-checked-before-fees.md` documented
that an earlier implementation compared against the gross output, which let
a high-fee gateway silently eat into the recipient's expected delivery.

## Forward CPI mechanics

`run_forward_cpi` builds the forward instruction from the caller-supplied
`remaining_accounts`:

```
remaining_accounts layout (forward half, after validation accounts):
┌──────────────────────────────────────────────────────────────────────┐
│ Meteora DLMM pool accounts, token_program, event authority, etc.     │
│ Forwarded verbatim — including executable accounts (H-04 comment in  │
│ run_forward_cpi explains why executables are NOT stripped).          │
└──────────────────────────────────────────────────────────────────────┘
```

The CPI is invoked with `invoke_signed` using only the ComposablePolicy PDA
seeds:

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

Set `target_program = Pubkey::default()` at create time. The handler detects
this sentinel and:

- Skips the byte-range check (no selector to pin).
- Skips `run_forward_cpi` entirely.
- Reads the funded balance from `intermediate_input_ata` directly (for the
  same-mint topup path, input and output intermediates collapse into one
  account).

This is the "auto topup" pattern — pull USDC, deliver USDC, no swap. See
[allowlists-and-sentinels.md](allowlists-and-sentinels.md).
