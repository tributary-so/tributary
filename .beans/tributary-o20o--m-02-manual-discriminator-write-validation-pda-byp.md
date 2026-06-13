---
# tributary-o20o
title: 'M-02: Manual Discriminator Write — validation_pda Bypasses Anchor init'
status: todo
type: task
priority: normal
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-13T05:51:21Z
parent: tributary-4kt4
---

# M-02: Manual Discriminator Write — `validation_pda` Bypasses Anchor `init`

| Field              | Value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| **Severity**       | Medium                                                                       |
| **Status**         | Open                                                                         |
| **Files**          | `programs/tributary/src/instructions/composable/create_composable_policy.rs` |
|                    | `programs/tributary/src/state/validation_pda.rs`                             |
| **Program ID**     | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ`                                |
| **Anchor Version** | 0.31.1                                                                       |

---

## Description

The `create_composable_policy` instruction optionally creates a `ValidationPda` account to store validation data for composable policies. Because `ValidationPda` has a variable-size payload (`validation_data: Vec<u8>` up to 1024 bytes), the account cannot use Anchor's `init` constraint — which requires a compile-time constant for `space`. Instead, the handler:

1. Derives the PDA address manually via `Pubkey::find_program_address`
2. Creates the account via raw `system_program::create_account` CPI with runtime-computed space
3. Writes the Anchor discriminator and payload directly into the account data via `try_borrow_mut_data()`

This is a legitimate pattern for dynamically-sized accounts. However, the manual init bypasses several safety nets that Anchor's `init` constraint provides automatically:

1. **No discriminator collision detection** — if the account already exists with data, the discriminator is blindly overwritten. Anchor's `init` checks that the account is zeroed (freshly created) before writing the discriminator.
2. **No rent exemption verification** — the rent calculation uses `Rent::get()?.minimum_balance(space)`, which is correct, but the `space` value is derived from user-controlled `validation_data.len()`. If `space_for()` had a rounding error, the account could be underfunded.
3. **No account ownership check** — the `validation_pda` account is declared as `UncheckedAccount` with `/// CHECK`. If the CPI to `create_account` fails silently (or is front-run), subsequent raw writes target whatever account data exists at that address.
4. **Partial initialization on CPI failure** — if the `invoke_signed` CPI succeeds but one of the subsequent `copy_from_slice` calls panics (e.g., `validation_data` length exceeds the allocated space), the account exists on-chain with a valid discriminator but corrupted or zeroed payload data.

---

## Attack Scenario

### Scenario 1: Front-Running Account Creation

1. An attacker monitors the mempool for `CreateComposablePolicy` transactions.
2. Before the victim's transaction lands, the attacker submits a transaction that creates the same `validation_pda` PDA with a small amount of lamports and arbitrary data.
3. The victim's `create_account` CPI fails because the account already exists and has lamports.
4. However, the handler does **not** check the CPI return in a way that prevents the subsequent `try_borrow_mut_data()` writes. If the attacker's account happens to have the same owner (`TRibg8...`), the raw data writes succeed — overwriting the attacker's data with the victim's validation config.
5. The attacker's front-run data remains partially intact (only the first `10 + validation_data.len()` bytes are overwritten), and the account may have insufficient lamports for its new size.

**Mitigating factor:** The PDA derivation includes `composable_policy.key()` which is itself a fresh PDA with a bump derived from `user_payment.created_composable_count + 1`. This makes the address unpredictable until the `composable_policy` account is initialized in the same transaction. Since Solana processes transaction instructions atomically and the `composable_policy` PDA is freshly created by Anchor's `init` in the same instruction, a front-runner would need to predict the PDA address before the transaction is submitted — which requires knowing `created_composable_count + 1` and the bump, both of which are deterministic but only derivable with knowledge of the user_payment state.

### Scenario 2: Size Mismatch on Future Upgrades

1. `ValidationPda::space_for()` rounds up to 8-byte alignment: `(raw + 7) & !7`.
2. If a future upgrade changes `ValidationPda` serialization (e.g., adds a version field), existing accounts created with the old `space_for()` calculation may be too small for the new deserialization code.
3. The handler in `execute_composable` reads `data_len` from bytes `[8..10]` and then slices `val_pda_data[10..10 + data_len]` with **no bounds check against the actual account data length**.
4. If `data_len` is corrupted or the account is too small, this causes an out-of-bounds panic.

### Scenario 3: Insufficient Rent Due to Alignment Edge Case

`space_for` calculates: `let raw = 8 + 2 + data_len; (raw + 7) & !7`

For `data_len = 1`: raw = 11, space = 16. Account is created with 16 bytes.
The discriminator takes 8 bytes, `data_len` takes 2 bytes, data takes 1 byte = 11 bytes used. The remaining 5 bytes are padding within the allocated space. This is correct.

However, `ValidationPda::SIZE` (the fixed-size constant) is `8 + 2 + 1024 = 1034`. If any code path attempts to deserialize a dynamically-sized `ValidationPda` using `Account<ValidationPda>`, Anchor will expect exactly `SIZE` bytes and fail for accounts created with `space_for()`. This is currently safe because the `validation_pda` account is always accessed as `UncheckedAccount`, but a future developer may not realize this distinction.

---

## Impact

- **Account data integrity:** No validation that the account was freshly created before writing the discriminator. A pre-existing account at the PDA address could have its data partially overwritten.
- **Rent exemption risk:** The `space_for()` function is correct, but there is no post-CPI verification that the account is actually rent-exempt. If the rent calculation is somehow wrong (e.g., future rent model changes), the account could be garbage-collected.
- **Out-of-bounds read in execution:** The `execute_composable` handler reads `data_len` from the account and slices `val_pda_data[10..10 + data_len]` without verifying that `10 + data_len <= val_pda_data.len()`. A corrupted `data_len` field causes a runtime panic.
- **Future maintenance hazard:** The dual-size model (`SIZE` constant vs `space_for()` dynamic) creates a footgun for developers who may use `Account<ValidationPda>` deserialization on dynamically-sized accounts.

**Severity justification:** The front-running scenario is mitigated by PDA unpredictability. The primary risk is a maintenance hazard and missing bounds checks that could lead to runtime panics or data corruption in edge cases. Medium severity.

---

## Proof of Concept

### PoC 1: Missing bounds check in `execute_composable`

The `execute_composable` handler at `execute_composable.rs:294-296` reads:

```rust
let val_pda_data = val_pda_info.try_borrow_data()?;
let data_len = u16::from_le_bytes([val_pda_data[8], val_pda_data[9]]) as usize;
let val_data = val_pda_data[10..10 + data_len].to_vec();
```

If an attacker can write a large `data_len` value (e.g., `0xFFFF = 65535`) into bytes `[8..10]` of a `ValidationPda` account — for instance, by directly invoking the program with a crafted transaction that races the discriminator write — the slice `val_pda_data[10..10 + 65535]` will panic with an index-out-of-bounds error, causing the transaction to fail and potentially locking the composable policy from ever being executed.

### PoC 2: Alignment size vs fixed-size mismatch

```rust
// In validation_pda.rs
pub const SIZE: usize = 8 + 2 + MAX_VALIDATION_DATA_SIZE; // = 1034

pub fn space_for(data_len: usize) -> usize {
    let raw = 8 + 2 + data_len;
    (raw + 7) & !7 // e.g., data_len=1 → space=16
}
```

An account created with `space_for(1) = 16` bytes. If any future code uses:

```rust
let vpda: Account<ValidationPda> = Account::try_from(&validation_pda_info)?;
```

Anchor will try to deserialize the full `SIZE = 1034` bytes from a 16-byte account → deserialization failure.

---

## Patch

### Current Code (vulnerable sections)

**`create_composable_policy.rs:148-191`** — Manual init with no safety checks:

```rust
if has_validation {
    let validation_pda_key = Pubkey::find_program_address(
        &[VALIDATION_PDA_SEED, composable_policy.key().as_ref()],
        ctx.program_id,
    );
    require!(
        ctx.accounts.validation_pda.key() == validation_pda_key.0,
        TributaryError::ValidationPdaMismatch
    );

    let space = ValidationPda::space_for(validation_data.len());
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(space);

    let fee_payer_info = ctx.accounts.fee_payer.to_account_info();
    let validation_pda_info = ctx.accounts.validation_pda.to_account_info();

    let seeds: Vec<Vec<u8>> = vec![
        VALIDATION_PDA_SEED.to_vec(),
        composable_policy.key().as_ref().to_vec(),
        vec![validation_pda_key.1],
    ];
    let seed_slices: Vec<&[u8]> = seeds.iter().map(|s| s.as_slice()).collect();

    anchor_lang::solana_program::program::invoke_signed(
        &anchor_lang::solana_program::system_instruction::create_account(
            &fee_payer_info.key(),
            &validation_pda_info.key(),
            lamports,
            space as u64,
            ctx.program_id,
        ),
        &[fee_payer_info.clone(), validation_pda_info.clone()],
        &[&seed_slices],
    )?;

    let mut account_data = validation_pda_info.try_borrow_mut_data()?;
    let disc: &[u8] = &ValidationPda::DISCRIMINATOR;
    account_data[..8].copy_from_slice(disc);
    let data_len_u16 = validation_data.len() as u16;
    account_data[8..10].copy_from_slice(&data_len_u16.to_le_bytes());
    account_data[10..10 + validation_data.len()].copy_from_slice(&validation_data);
}
```

### Patched Code

#### a. Add safety checks and helper function to `validation_pda.rs`

```rust
use anchor_lang::prelude::*;

pub const MAX_VALIDATION_DATA_SIZE: usize = 1024;

#[account]
pub struct ValidationPda {
    pub data_len: u16,
    pub data: [u8; MAX_VALIDATION_DATA_SIZE],
}

impl ValidationPda {
    pub const SIZE: usize = 8 + 2 + MAX_VALIDATION_DATA_SIZE;

    pub fn space_for(data_len: usize) -> usize {
        let raw = 8 + 2 + data_len;
        (raw + 7) & !7
    }

    pub fn get_data(&self) -> &[u8] {
        &self.data[..self.data_len as usize]
    }

    /// Validate that an account's data length is consistent with the stored data_len field.
    /// Returns the actual data_len stored in the account, or an error if inconsistent.
    pub fn validate_account_size(data: &[u8]) -> Result<u16> {
        require!(
            data.len() >= 10,
            crate::error::TributaryError::ValidationDataRequired
        );
        let data_len = u16::from_le_bytes([data[8], data[9]]) as usize;
        require!(
            10usize.saturating_add(data_len) <= data.len(),
            crate::error::TributaryError::ValidationDataTooLarge
        );
        Ok(data_len as u16)
    }

    /// Verify an account is freshly created (all data zeroed) before manual init.
    /// Returns true if the account data is all zeros (freshly created via system_program).
    pub fn is_fresh_account(data: &[u8]) -> bool {
        data.iter().all(|&b| b == 0)
    }
}
```

#### b. Patched `create_composable_policy.rs` handler — lines 148–191

Replace the `if has_validation` block with:

```rust
if has_validation {
    let validation_pda_key = Pubkey::find_program_address(
        &[VALIDATION_PDA_SEED, composable_policy.key().as_ref()],
        ctx.program_id,
    );
    require!(
        ctx.accounts.validation_pda.key() == validation_pda_key.0,
        TributaryError::ValidationPdaMismatch
    );

    let space = ValidationPda::space_for(validation_data.len());
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(space);

    let fee_payer_info = ctx.accounts.fee_payer.to_account_info();
    let validation_pda_info = ctx.accounts.validation_pda.to_account_info();

    // Verify the account is not yet initialized (data should be zeroed)
    {
        let existing_data = validation_pda_info.try_borrow_data()?;
        require!(
            ValidationPda::is_fresh_account(&existing_data),
            TributaryError::ValidationPdaMismatch
        );
    }

    let seeds: Vec<Vec<u8>> = vec![
        VALIDATION_PDA_SEED.to_vec(),
        composable_policy.key().as_ref().to_vec(),
        vec![validation_pda_key.1],
    ];
    let seed_slices: Vec<&[u8]> = seeds.iter().map(|s| s.as_slice()).collect();

    anchor_lang::solana_program::program::invoke_signed(
        &anchor_lang::solana_program::system_instruction::create_account(
            &fee_payer_info.key(),
            &validation_pda_info.key(),
            lamports,
            space as u64,
            ctx.program_id,
        ),
        &[fee_payer_info.clone(), validation_pda_info.clone()],
        &[&seed_slices],
    )?;

    // Post-CPI: verify the account was created correctly
    {
        let account_data = validation_pda_info.try_borrow_data()?;
        require!(
            account_data.len() == space,
            TributaryError::ValidationDataTooLarge
        );
        require!(
            validation_pda_info.owner == ctx.program_id,
            TributaryError::ValidationPdaMismatch
        );
        require!(
            validation_pda_info.lamports() >= lamports,
            TributaryError::ValidationPdaMismatch
        );
    }

    // Write discriminator and data
    {
        let mut account_data = validation_pda_info.try_borrow_mut_data()?;
        account_data[..8].copy_from_slice(&ValidationPda::DISCRIMINATOR);
        let data_len_u16 = validation_data.len() as u16;
        account_data[8..10].copy_from_slice(&data_len_u16.to_le_bytes());
        account_data[10..10 + validation_data.len()].copy_from_slice(&validation_data);
    }
}
```

#### c. Patched `execute_composable.rs` — bounds check on validation data read

Replace lines 294–296:

```rust
// Before (no bounds check):
let val_pda_data = val_pda_info.try_borrow_data()?;
let data_len = u16::from_le_bytes([val_pda_data[8], val_pda_data[9]]) as usize;
let val_data = val_pda_data[10..10 + data_len].to_vec();
```

With:

```rust
let val_pda_data = val_pda_info.try_borrow_data()?;

// Verify discriminator
require!(
    val_pda_data[..8] == ValidationPda::DISCRIMINATOR,
    TributaryError::ValidationPdaMismatch
);

// Bounds-checked data extraction
let data_len = ValidationPda::validate_account_size(&val_pda_data)
    .map_err(|_| TributaryError::ValidationDataTooLarge)? as usize;
let val_data = val_pda_data[10..10 + data_len].to_vec();
```

---

## Testing Instructions

### 1. Verify fresh-account check

Write a test that attempts `create_composable_policy` with a `validation_pda` account that already has data written to it (pre-funded with lamports). The transaction should fail with `ValidationPdaMismatch`.

```typescript
it("rejects pre-initialized validation_pda", async () => {
  // Pre-create the validation_pda PDA with some data
  const [validationPda] = PublicKey.findProgramAddress(
    [
      Buffer.from("composable_validation"),
      composablePolicy.publicKey.toBuffer(),
    ],
    programId
  );
  // Send lamports to the PDA to simulate a pre-existing account
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(validationPda, 1_000_000)
  );
  // The create_composable_policy call should fail
  try {
    await program.methods
      .createComposablePolicy(/* ... */)
      .accounts({ validationPda /* ... */ })
      .rpc();
    assert.fail("Should have rejected pre-initialized account");
  } catch (e) {
    assert.isTrue(e.toString().includes("ValidationPdaMismatch"));
  }
});
```

### 2. Verify rent exemption

After creating a composable policy with validation, verify the `validation_pda` account is rent-exempt:

```typescript
it("validation_pda is rent-exempt after creation", async () => {
  const balance = await provider.connection.getBalance(validationPda);
  const rentExempt =
    await provider.connection.getMinimumBalanceForRentExemption(expectedSpace);
  assert.isAtLeast(balance, rentExempt);
});
```

### 3. Verify bounds check in execution

Test that corrupted `data_len` in a `validation_pda` causes a clean error rather than a panic:

```typescript
it("handles corrupted data_len gracefully", async () => {
  // Manually corrupt the data_len field to a large value
  // This requires a test that directly writes to the account data
  // In a local validator test, use a custom instruction to corrupt the field
  // Then attempt execute_composable and verify it returns ValidationDataTooLarge
});
```

### 4. Run existing test suite

```bash
anchor test
```

All existing tests must continue to pass after applying the patch.

### 5. Verify account size consistency

```bash
# After test run, query the validation_pda account and verify:
# - account.data.length == ValidationPda.space_for(original_data_len)
# - discriminator matches ValidationPda::DISCRIMINATOR
# - lamports >= rent.minimum_balance(space)
solana account <VALIDATION_PDA_ADDRESS> --url localhost
```
