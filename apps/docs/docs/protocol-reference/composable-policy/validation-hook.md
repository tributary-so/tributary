# Validation Hook

The **validation hook** is an opt-in read-only assertion CPI that runs
**between** the pull (Phase 1) and the forward (Phase 3) phases of
`execute_composable`. It lets a policy encode an on-chain predicate — "the
recipient's hot wallet USDC balance is below 50 USDC" — that **must hold**
before the rest of the execution proceeds. If the assertion fails, the entire
transaction aborts and the pull is rolled back.

The hook is implemented by the **Lighthouse** on-chain assertion checker
(`L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`), the only entry in
`ALLOWED_VALIDATION_PROGRAMS`.

## ValidationConfig (on-policy)

Stored inline on the `ComposablePolicy` account:

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub struct ValidationConfig {
    /// The CPI target. `SystemProgram` (or `Pubkey::default()`) is the
    /// "validation disabled" sentinel — see allowlists-and-sentinels.md.
    pub validation_program: Pubkey,

    /// Number of Lighthouse read-accounts declared by the assertion.
    /// Capped at 10 by create_composable_policy.
    pub num_validation_accounts: u8,
}

impl ValidationConfig {
    pub const SIZE: usize = 32 + 1; // = 33 bytes
}
```

The assertion **data** is NOT stored here — it lives in the separate
`ValidationPda` account (below).

## ValidationPda — separate account, ≤ 512 bytes

The assertion payload is stored in its own PDA account, derived from the
`ComposablePolicy` key:

| PDA             | Seeds                                          | Max size                        |
| --------------- | ---------------------------------------------- | ------------------------------- |
| `ValidationPda` | `["composable_validation", composable_policy]` | 8 (disc) + 2 (`data_len`) + 512 |

```rust
pub const MAX_VALIDATION_DATA_SIZE: usize = 512;

#[account]
pub struct ValidationPda {
    pub data_len: u16,
    pub data: [u8; MAX_VALIDATION_DATA_SIZE],
}

impl ValidationPda {
    pub const SIZE: usize = 8 + 2 + MAX_VALIDATION_DATA_SIZE;
    pub fn space_for(data_len: usize) -> usize {
        let raw = 8 + 2 + data_len;
        (raw + 7) & !7           // 8-byte align for rent efficiency
    }
}
```

Source: `programs/tributary/src/state/validation_pda.rs`.

### Account layout (on-chain bytes)

| Offset  | Length     | Field                | Notes                                             |
| ------- | ---------- | -------------------- | ------------------------------------------------- |
| `0..8`  | 8          | Anchor discriminator | `ValidationPda::DISCRIMINATOR`                    |
| `8..10` | 2          | `data_len`           | `u16` LE; bounded by `MAX_VALIDATION_DATA_SIZE`   |
| `10..`  | `data_len` | assertion `data`     | Opaque bytes passed verbatim as the CPI `ix.data` |

The remaining bytes up to `8 + 2 + 512` are zero-padded; the on-chain
account is always full-sized, but only `data[10..10+data_len]` is meaningful.

## Create-time flow

`create_composable_policy` performs the following when validation is
requested:

1. **Allowlist check** — `validation_program` must equal Lighthouse, else
   `InvalidValidationProgram`. Passing `SystemProgram` selects the disabled
   path (no `ValidationPda` is allocated).
2. **Data bounds** — `!validation_data.is_empty()` and
   `validation_data.len() <= MAX_VALIDATION_DATA_SIZE`, else
   `ValidationDataRequired` / `ValidationDataTooLarge`.
3. **Account bound** — `num_validation_accounts <= 10`.
4. **PDA derivation** — the caller-supplied `validation_pda` account must
   equal `find_program_address(["composable_validation", composable_policy])`.
5. **Freshness guard** — `ValidationPda::is_fresh(&info)` requires
   `lamports == 0` and `owner == system_program`. This is the defense-in-depth
   re-init / type-cosplay check (M-02).
6. **Manual init** — `system_instruction::create_account` signed by the
   fee payer, then the discriminator + `data_len` + `data` are written
   directly via `try_borrow_mut_data`.

## Execute-time flow

At the top of Phase 2, the handler does:

```rust
let val_pda_key = Pubkey::find_program_address(
    &[VALIDATION_PDA_SEED, policy_key.as_ref()],
    ctx.program_id,
);
require!(remaining[0].key() == val_pda_key.0, ValidationPdaMismatch);
```

It then reads `data_len` from offset `8..10` and slices
`data[10..10+data_len]` out of the `ValidationPda` account. The slice is
passed verbatim as the `Instruction.data` for the Lighthouse CPI. The next
`num_validation_accounts` `remaining_accounts` are forwarded as Lighthouse's
read-accounts.

```
remaining_accounts layout (validation half):
┌─────────────────────────┬───────────────────────────────┐
│  remaining_accounts[0]  │  ValidationPda                │
├─────────────────────────┼───────────────────────────────┤
│  [1..1+N]               │  Lighthouse read-accounts (N) │
└─────────────────────────┴───────────────────────────────┘
                              N = validation_config.num_validation_accounts (≤ 10)
```

If validation is disabled (`validation_program == Pubkey::default()`), the
handler skips Phase 2 entirely and consumes zero `remaining_accounts`. The
`forward_accounts_start` index returned by the validation helper is `0`.

## Read-only / no-signer CPI (C-1 remediation)

Lighthouse is invoked via **plain `invoke`** — **no** signer seeds are
forwarded:

```rust
anchor_lang::solana_program::program::invoke(&instruction, &all_infos)?;
```

This is the security-critical fix from
`reports/C-1-validation-cpi-signer-leak.md`. The previous implementation
called `invoke_signed` with the `UserPayment` PDA seeds; because the
`UserPayment` PDA is the delegate on `user_token_account`, this granted the
validation program — and any program it nested into — the ability to drain
user funds via a nested Token `transfer`.

Two properties make the plain-`invoke` fix safe:

1. Lighthouse is an assertion checker — it is read-only by design.
2. The validation CPI runs **before** Phase 3 funds the intermediate ATAs,
   so there is literally nothing in the intermediates for a validation
   program to move even if it tried.

`build_validation_account_metas` hard-codes every forwarded account to
`is_signer: false, is_writable: false`, so even if the caller re-passes
`fee_payer` (a `Signer`) as a remaining account, Lighthouse cannot inherit
that authority.

## Disabling validation

Pass `SystemProgram` as the `validation_program` argument at create time.
The handler detects this sentinel, leaves `validation_config` at its
`Default` (`Pubkey::default()`, 0), and skips `ValidationPda` allocation
entirely. See [allowlists-and-sentinels.md](allowlists-and-sentinels.md)
for the full sentinel convention.

## SDK usage

Use the `lighthouse` fluent facade from `@tributary-so/sdk` to build the
`{ data, numAccounts, accounts }` triple — never hand-roll the
serialization.

```typescript
import { lighthouse, LIGHTHOUSE_PROGRAM_ID } from "@tributary-so/sdk";

// Assert hotWallet USDC balance < 50 USDC before topping up
const guard = lighthouse
  .tokenAccount(hotWalletUsdcAta)
  .amount(50_000_000, "<")
  .build();

// guard.data         → Buffer (≤ 512 bytes, stored in ValidationPda)
// guard.numAccounts  → 1        (numValidationAccounts)
// guard.accounts     → [hotWalletUsdcAta]  (Lighthouse read-account slice)
```

At execute time, the caller assembles Tributary's full `remaining_accounts`
list as `[ValidationPda, ...guard.accounts, ...forwardAccounts]`. The facade
owns **only** the Lighthouse target_account(s); Tributary prepends the
`ValidationPda` itself.
