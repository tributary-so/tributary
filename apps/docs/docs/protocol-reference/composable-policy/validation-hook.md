# Validation Hook

The **validation hook** is an opt-in read-only assertion CPI that runs
**between** the pull (Phase 1) and the forward (Phase 3) phases of
`execute_composable`. It lets a policy encode an on-chain predicate — "the
recipient's hot wallet USDC balance is below 50 USDC" — that **must hold**
before the rest of the execution proceeds. If the assertion fails, the entire
transaction aborts and the pull is rolled back.

ComposablePolicy supports **two** independent validation slots: **pre** (runs
before forward, after skim) and **post** (runs after forward, before
settlement). Each is independently opt-in.

The hook is implemented by the **Lighthouse** on-chain assertion checker
(`L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`), the only entry in
`ALLOWED_VALIDATION_PROGRAMS`.

## ValidationSpec (on-policy)

Stored inline on the `ComposablePolicy` account (two instances:
`pre_validation` and `post_validation`):

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Default)]
pub enum ValidationSpec {
    #[default]
    Disabled,
    ProgramCall {
        program_id: Pubkey,
    },
    Inline {
        reserved: u8,
    },  // not implemented — errors at create
}

impl ValidationSpec {
    pub const SIZE: usize = 1 + 32;  // discriminant + max variant (ProgramCall)

    pub fn is_program_call(&self) -> bool { ... }
    pub fn program_id(&self) -> Pubkey { ... }
}
```

`Disabled` → no CPI, no `ValidationPda` allocated.
`ProgramCall { program_id }` → the program must be in
`ALLOWED_VALIDATION_PROGRAMS`. `Inline` is reserved for a future compressed
assertion format; it is rejected at create.

Source: `programs/tributary/src/state/composable_policy.rs`.

## ValidationPda — separate account, ≤ 512 bytes

The assertion payload for each active slot lives in its own PDA:

| PDA                 | Seeds                                               | Max size                           |
| ------------------- | --------------------------------------------------- | ---------------------------------- |
| `PreValidationPda`  | `["composable_validation_pre", composable_policy]`  | 8 (disc) + 68 (header) + 512 = 588 |
| `PostValidationPda` | `["composable_validation_post", composable_policy]` | 8 (disc) + 68 (header) + 512 = 588 |

```rust
pub const MAX_VALIDATION_DATA_SIZE: usize = 512;
pub const MAX_PINNED_ACCOUNTS: usize = 2;

#[account]
pub struct ValidationPda {
    pub bump: u8,
    pub num_pinned_accounts: u8,
    pub pinned_accounts: [Pubkey; MAX_PINNED_ACCOUNTS],
    pub data_len: u16,
    pub data: [u8; MAX_VALIDATION_DATA_SIZE],
}

impl ValidationPda {
    pub const SIZE: usize = 8 + 1 + 1 + 64 + 2 + MAX_VALIDATION_DATA_SIZE; // = 588

    pub fn get_data(&self) -> &[u8] { ... }
    pub fn pinned(&self) -> &[Pubkey] { ... }
    pub fn is_fresh(info: &AccountInfo) -> bool { ... }
}
```

Source: `programs/tributary/src/state/validation_pda.rs`.

### Account layout (on-chain bytes)

| Offset   | Length     | Field                 | Notes                                             |
| -------- | ---------- | --------------------- | ------------------------------------------------- |
| `0..8`   | 8          | Anchor discriminator  | `ValidationPda::DISCRIMINATOR`                    |
| `8..9`   | 1          | `bump`                | Canonical PDA bump                                |
| `9..10`  | 1          | `num_pinned_accounts` | Assertion arity ∈ {0, 1, 2}                       |
| `10..74` | 64         | `pinned_accounts`     | 2 × 32-byte Pubkeys                               |
| `74..76` | 2          | `data_len`            | `u16` LE; bounded by `MAX_VALIDATION_DATA_SIZE`   |
| `76..`   | `data_len` | assertion `data`      | Opaque bytes passed verbatim as the CPI `ix.data` |

The remaining bytes up to 588 are zero-padded.

## Create-time flow

`create_composable_policy` handles pre and post validation independently:

1. **Allowlist check** — `spec.program_id()` must equal Lighthouse, else
   `InvalidValidationProgram`. Passing `SystemProgram` selects `Disabled`
   (no `ValidationPda` allocated).
2. **ValidationInit guards** — when `spec` is `ProgramCall`:
   - `validation_data` must be non-empty, capped at `MAX_VALIDATION_DATA_SIZE`.
   - `num_pinned_accounts` ≤ `MAX_PINNED_ACCOUNTS` (2).
   - `pinned_accounts` must have concrete, non-default pubkeys.
3. **PDA derivation** — for each `ProgramCall` slot, the caller-supplied
   `{pre,post}_validation_pda` must match
   `find_program_address(["composable_validation_pre", composable_policy])`
   or `find_program_address(["composable_validation_post", composable_policy])`
   respectively.
4. **Freshness guard** — each `ValidationPda::is_fresh(info)` requires
   `lamports == 0` and `owner == system_program`. Defense-in-depth against
   re-init / type-cosplay (M-02).
5. **Manual init** — `system_instruction::create_account` signed by the
   fee payer, then discriminator + fields written via `try_borrow_mut_data`.

Each slot is independently creatable — a policy may have only pre-validation,
only post-validation, both, or neither.

## Execute-time flow

`ValidationPda` accounts enter as **typed accounts** in `accountsStrict`, not
in `remaining_accounts`. The `remaining_accounts` carry only the **Lighthouse
read-target accounts** (pinned by the owner at create time).

Layout of `remaining_accounts`:

```
┌───────────────────────┬────────────────────────┬───────────────────────┬────────────────┐
│ pre-val targets (N)   │ forward accounts       │ post-val targets (M) │ scheduler ATA? │
└───────────────────────┴────────────────────────┴───────────────────────┴────────────────┘
  N = pre-num-pinned          ^                    M = post-num-pinned
  (≤ 2)                    forward_accounts_start   (≤ 2)
```

### Step-by-step

1. **Scheduler strip** — if the caller is not the gateway signer and
   `scheduler_share_bps > 0`, the last entry is peeled off as the scheduler
   fee ATA.
2. **Post-validation target strip** — if `post_validation` is `ProgramCall`,
   the last `num_pinned` accounts are peeled off for Phase 4. The remaining
   slice (`remaining_mid`) contains `[pre-val targets, forward accounts]`.
3. **Phase 2: Pre-validation** — `run_validation_cpi` reads the
   `pre_validation_pda` from `accountsStrict`, verifies the PDA seed matches,
   deserialises the `ValidationPda`, pin-checks `remaining_mid[0..N]` against
   `pinned_accounts`, then invokes the validation program (Lighthouse) via
   plain `invoke` with those N accounts. Returns `N` as
   `forward_accounts_start`.
4. **Phase 3: Forward** — accounts starting at `remaining_mid[forward_start]`
   are forwarded to the forward program.
5. **Phase 4: Post-validation** — `run_validation_cpi` runs the same logic
   against `post_validation_pda` and the previously stripped
   `post_val_accounts`.

```rust
// Phase 2 — pre-validation
let forward_accounts_start = if pre_validation.is_program_call() {
    let pre_pda_info = ctx.accounts.pre_validation_pda.to_account_info();
    run_validation_cpi(
        remaining_mid,           // [pre-val targets, forward accounts]
        &pre_pda_info,
        &policy_key,
        ctx.program_id,
        &pre_program_info,
        VALIDATION_PDA_PRE_SEED,
    )?
} else {
    0
};

// Phase 4 — post-validation
if post_validation.is_program_call() {
    let post_pda_info = ctx.accounts.post_validation_pda.to_account_info();
    run_validation_cpi(
        &post_val_accounts,      // already stripped before Phase 2
        &post_pda_info,
        &policy_key,
        ctx.program_id,
        &post_program_info,
        VALIDATION_PDA_POST_SEED,
    )?;
}
```

Source: `programs/tributary/src/instructions/composable/execute_composable.rs`
(around lines 1232–1295).

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
2. The validation CPI has no PDA signing authority. Even though Phase 1b
   (Skim) funded the intermediate input ATA with `face` before pre-validation
   runs, the validation program cannot move those tokens — only the
   `ComposablePolicy` PDA (used with `invoke_signed` in forward/sweep phases)
   has authority over the intermediates.

`build_validation_account_metas` hard-codes every forwarded account to
`is_signer: false, is_writable: false`, so even if the caller re-passes
`fee_payer` (a `Signer`) as a remaining account, Lighthouse cannot inherit
that authority.

## Disabling validation

Pass `{ disabled: {} }` as the `preValidation` / `postValidation` parameter
at create time. The handler detects the `Disabled` variant, leaves the slot
at its `Default`, and skips `ValidationPda` allocation entirely.

## SDK usage

Use the `lighthouse` fluent facade from `@tributary-so/sdk` to build the
`{ data, numAccounts, accounts }` triple — never hand-roll the
serialization.

```typescript
import {
  Tributary,
  lighthouse,
  LIGHTHOUSE_PROGRAM_ID,
} from "@tributary-so/sdk";

// Assert hotWallet USDC balance < 50 USDC before topping up
const guard = lighthouse
  .tokenAccount(hotWalletUsdcAta)
  .amount(50_000_000, "<")
  .build();

// guard.data         → Buffer (≤ 512 bytes, stored in ValidationPda)
// guard.numAccounts  → 1        (numValidationAccounts / numPinnedAccounts)
// guard.accounts     → [hotWalletUsdcAta]  (Lighthouse read-account slice)

// Create composable policy with dual validation (pre only, post disabled):
const ix = await sdk.getCreateComposablePolicyInstruction(
  tokenMint,
  recipient,
  gateway,
  policyType,
  memo,
  forwardConfig,
  { programCall: { programId: LIGHTHOUSE_PROGRAM_ID } }, // preValidation
  guard.accounts, // prePinnedAccounts — Lighthouse targets
  guard.data, // preValidationData — assertion bytes
  { disabled: {} }, // postValidation — disabled
  [],
  Buffer.alloc(0)
);

// At execute time the caller assembles remaining_accounts as:
// [prePinnedAccounts, ...forwardAccounts, postPinnedAccounts, schedulerAta?]
// The facade owns ONLY the Lighthouse target_account(s); the SDK
// provides the full list in the correct order at execute.
```
