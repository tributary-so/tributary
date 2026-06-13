---
# tributary-y35e
title: 'H-05: Validation CPI Layer Is a No-Op Stub'
status: todo
type: task
priority: high
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-13T05:51:21Z
parent: tributary-4kt4
---

# H-05: Validation CPI Layer Is a No-Op Stub

| Field          | Value                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**   | High                                                                                                                             |
| **File**       | `programs/tributary/src/shared/validation.rs:3-11`                                                                               |
| **Related**    | `programs/tributary/src/instructions/composable/execute_composable.rs:263-348`, `programs/tributary/src/state/validation_pda.rs` |
| **Program ID** | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6X1Sg42tJ`                                                                                     |
| **Framework**  | Anchor 0.31.1                                                                                                                    |

---

## Description

The program implements a composable policy system with a pluggable validation layer. `ValidationConfig` stores a `validation_program` pubkey and `num_validation_accounts` on each `ComposablePolicy`. A `ValidationPda` account stores up to 1024 bytes of arbitrary validation data. The system is designed so that before a composable payment executes, an external validation program is invoked via CPI to verify conditions (milestone completion, oracle data, etc.).

**What it's supposed to do:** `dispatch_validation_cpi` in `shared/validation.rs` is the intended reusable entry point for validation. It should accept a `ValidationConfig`, remaining accounts, and user payment context, then perform a CPI to the configured validation program.

**What it actually does:** Nothing.

```rust
// shared/validation.rs:3-11
pub fn dispatch_validation_cpi<'info>(
    _validation_config: &crate::state::composable_policy::ValidationConfig,
    _remaining_accounts: &[AccountInfo<'info>],
    _user_payment_owner: &Pubkey,
    _user_payment_mint: &Pubkey,
    _user_payment_bump: u8,
) -> anchor_lang::Result<()> {
    Ok(())  // <--- always succeeds, never validates
}
```

Every parameter is underscored (`_validation_config`, `_remaining_accounts`, etc.), meaning the function body ignores all inputs and unconditionally returns `Ok(())`.

### The Dead Code Surface

Two functions in `shared/validation.rs` are completely dead:

1. **`dispatch_validation_cpi`** — Never called from any instruction handler. The `execute_composable` handler has its own inline CPI logic (lines 263-348) that directly calls `invoke_signed` to the validation program.
2. **`split_remaining_accounts`** — Never called from any instruction handler. A utility for partitioning `remaining_accounts` between validation and forward CPI accounts that no code path uses.

### The Inline Workaround

`execute_composable.rs` (lines 263-348) performs validation inline rather than through the shared function. This inline code:

1. Reads `ValidationPda` data from `remaining_accounts[0]`
2. Constructs an `Instruction` with the validation program, validation accounts, and validation data
3. Calls `invoke_signed` with composable policy PDA seeds

This works in isolation, but the shared validation module exists as a false abstraction layer — any future code path that calls `dispatch_validation_cpi` (e.g., a new instruction, a batch executor, a SDK helper) will silently skip validation.

### The Whitelist Contains a Placeholder

```rust
// constants.rs:20-23
pub const ALLOWED_VALIDATION_PROGRAMS: &[Pubkey] = &[Pubkey::new_from_array([
    27, 132, 9, 36, 40, 199, 39, 73, 206, 202, 182, 138, 49, 228, 255, 26, 84, 15, 1, 59, 33, 181,
    20, 108, 33, 121, 11, 218, 102, 79, 120, 118,
])];
```

This is a single hardcoded pubkey. There is no indication that this corresponds to a deployed, audited validation oracle. If this is a placeholder or test key, the entire validation flow is theater.

---

## Attack Scenario

### Scenario 1: Milestone Payments Without Verification

A `ScheduleType::Milestone` policy can have `release_condition` bit flags that gate payment on external validation. An integrator sets `release_condition = 0b0010` ("validation required") and configures `validation_program` to an oracle that checks milestone completion. The expectation:

1. User creates composable policy with milestone schedule and validation config
2. On execution, validation CPI confirms milestone is met
3. Payment releases

**What happens:** The inline code in `execute_composable.rs` does invoke the validation program, but `dispatch_validation_cpi` — the canonical API surface documented for this purpose — does nothing. If any alternate execution path (batch executor, SDK-triggered execution, future instruction) calls `dispatch_validation_cpi` instead of the inline path, validation is silently skipped.

### Scenario 2: Integrator Trust

A downstream protocol integrates Tributary and reads the `ValidationConfig` from on-chain state to determine if a policy has validation enabled. They see `validation_program != Pubkey::default()` and conclude: "this policy's payments are verified by an oracle." They then treat the payment as confirmed proof of milestone completion.

**What happens:** The validation program was invoked but may be a no-op or placeholder. The `ValidationPda` stores data that was never verified by any meaningful oracle. The integrator's trust is misplaced.

### Scenario 3: Future Code Path Regression

A developer adds a new instruction (e.g., `batch_execute_composable`) and naturally calls `dispatch_validation_cpi` since it exists as the shared utility. Every batch execution silently skips validation. Millions of dollars flow through policies that were supposed to have oracle-verified conditions.

---

## Impact

- **False security guarantee:** The existence of `ValidationConfig`, `ValidationPda`, `ALLOWED_VALIDATION_PROGRAMS`, and `dispatch_validation_cpi` creates the appearance of a fully wired validation system. It is not.
- **Dead abstraction:** The shared validation module (`shared/validation.rs`) exports two public functions that are never used. This is misleading to auditors, integrators, and future developers.
- **Silent bypass risk:** Any code path that calls `dispatch_validation_cpi` instead of the inline logic in `execute_composable.rs` will skip all validation without error.
- **Placeholder oracle:** The single whitelisted validation program pubkey has no documented corresponding deployed program. If it's a test key, the validation CPI is calling into the void.

---

## Proof of Concept

### PoC 1: The No-Op Function

```rust
// programs/tributary/src/shared/validation.rs (FULL FILE)
use anchor_lang::prelude::*;

pub fn dispatch_validation_cpi<'info>(
    _validation_config: &crate::state::composable_policy::ValidationConfig,
    _remaining_accounts: &[AccountInfo<'info>],
    _user_payment_owner: &Pubkey,
    _user_payment_mint: &Pubkey,
    _user_payment_bump: u8,
) -> anchor_lang::Result<()> {
    Ok(())  // No validation. No CPI. No check. Just "sure, fine".
}
```

### PoC 2: Dead Code Verification

```bash
# Confirm dispatch_validation_cpi is never called
$ grep -rn "dispatch_validation_cpi" programs/tributary/src/
programs/tributary/src/shared/validation.rs:3:pub fn dispatch_validation_cpi<'info>(

# Confirm split_remaining_accounts is never called
$ grep -rn "split_remaining_accounts" programs/tributary/src/
programs/tributary/src/shared/validation.rs:13:pub fn split_remaining_accounts<'info>(
```

Both functions appear only at their definition site. Zero call sites.

### PoC 3: Inline Bypass in execute_composable

The actual execution path at `execute_composable.rs:263-348` performs validation inline. But note the disjoint:

```
shared/validation.rs:  dispatch_validation_cpi() → Ok(())         [NEVER CALLED]
execute_composable.rs: inline invoke_signed() → actual CPI        [IN USE]
```

If a developer adds any new execution path and reaches for the "shared" function, validation silently disappears.

---

## Patch Options

### Option A: Remove the Stub Entirely (Recommended for Mainnet)

Delete the dead code. The inline validation in `execute_composable.rs` is the actual implementation. Keeping a misleading stub is worse than having no stub.

**`programs/tributary/src/shared/validation.rs` — Replace entire file:**

```rust
// Intentionally left empty.
// Validation CPI is performed inline in execute_composable.rs.
// Do NOT add a shared validation dispatch function unless it
// actually invokes the validation program.
```

Or delete the file entirely and remove the module reference:

**`programs/tributary/src/shared/mod.rs` — Remove line 4:**

```diff
 pub mod delegation;
 pub mod fees;
 pub mod strategies;
-pub mod validation;
```

Then delete:

```bash
rm programs/tributary/src/shared/validation.rs
```

**Why:** Dead code that looks like it does something is a liability. Future developers will call it and create silent bypasses.

---

### Option B: Add a Feature Gate

Only compile validation dispatch when a Cargo feature is enabled. This prevents accidental use while preserving the API for future implementation.

**`programs/tributary/Cargo.toml` — Add feature:**

```toml
[features]
default = []
validation-cpi = []
```

**`programs/tributary/src/shared/validation.rs` — Replace entire file:**

```rust
use anchor_lang::prelude::*;

#[cfg(not(feature = "validation-cpi"))]
pub fn dispatch_validation_cpi<'info>(
    _validation_config: &crate::state::composable_policy::ValidationConfig,
    _remaining_accounts: &[AccountInfo<'info>],
    _user_payment_owner: &Pubkey,
    _user_payment_mint: &Pubkey,
    _user_payment_bump: u8,
) -> anchor_lang::Result<()> {
    // STUB: Not compiled with "validation-cpi" feature.
    // See execute_composable.rs for the inline validation CPI path.
    Err(crate::error::TributaryError::ValidationProgram.into())
}

#[cfg(feature = "validation-cpi")]
pub fn dispatch_validation_cpi<'info>(
    validation_config: &crate::state::composable_policy::ValidationConfig,
    remaining_accounts: &[AccountInfo<'info>],
    user_payment_owner: &Pubkey,
    user_payment_mint: &Pubkey,
    user_payment_bump: u8,
) -> anchor_lang::Result<()> {
    // TODO: Implement validation CPI dispatch
    // For now, fail closed when the feature is enabled but not implemented
    Err(crate::error::TributaryError::ValidationProgram.into())
}

pub fn split_remaining_accounts<'info>(
    remaining_accounts: &'info [AccountInfo<'info>],
    num_validation_accounts: u8,
    has_validation: bool,
) -> (&'info [AccountInfo<'info>], &'info [AccountInfo<'info>]) {
    if !has_validation {
        return (&[], remaining_accounts);
    }
    let split = 1 + num_validation_accounts as usize;
    if split >= remaining_accounts.len() {
        (remaining_accounts, &[])
    } else {
        (&remaining_accounts[..split], &remaining_accounts[split..])
    }
}
```

**`programs/tributary/src/error.rs` — Add variant:**

```diff
     #[msg("Composable policy not found")]
     ComposablePolicyNotFound,
+    #[msg("Validation CPI not implemented — stub called")]
+    ValidationCpiNotImplemented,
```

Update the error reference in validation.rs accordingly (`TributaryError::ValidationCpiNotImplemented`).

**Why:** Fail-closed is always safer than fail-open. Without the feature flag, any call to `dispatch_validation_cpi` errors out instead of silently succeeding.

---

### Option C: Implement Basic Validation

Wire `dispatch_validation_cpi` to actually call the validation program, extracting the inline logic from `execute_composable.rs` into the shared function.

**`programs/tributary/src/shared/validation.rs` — Replace entire file:**

```rust
use anchor_lang::prelude::*;
use crate::constants::*;

pub fn dispatch_validation_cpi<'info>(
    validation_config: &crate::state::composable_policy::ValidationConfig,
    remaining_accounts: &[AccountInfo<'info>],
    composable_policy_key: &Pubkey,
    composable_policy_bump: u8,
    user_payment: &Pubkey,
    policy_id: u32,
) -> anchor_lang::Result<usize> {
    let validation_program = validation_config.validation_program;

    if validation_program == Pubkey::default() {
        return Ok(0);
    }

    require!(
        !remaining_accounts.is_empty(),
        crate::error::TributaryError::ValidationPdaMismatch
    );

    let val_pda_key = Pubkey::find_program_address(
        &[
            VALIDATION_PDA_SEED,
            composable_policy_key.as_ref(),
        ],
        &crate::ID,
    );
    require!(
        remaining_accounts[0].key() == val_pda_key,
        crate::error::TributaryError::ValidationPdaMismatch
    );

    let val_pda_info = &remaining_accounts[0];
    let val_pda_data = val_pda_info.try_borrow_data()?;
    let data_len = u16::from_le_bytes([val_pda_data[8], val_pda_data[9]]) as usize;
    let val_data = val_pda_data[10..10 + data_len].to_vec();

    let num_val_accounts = validation_config.num_validation_accounts as usize;
    let val_accounts_end = 1 + num_val_accounts;
    require!(
        remaining_accounts.len() >= val_accounts_end,
        crate::error::TributaryError::ValidationPdaMismatch
    );

    let val_accounts: Vec<AccountInfo<'info>> = remaining_accounts[1..val_accounts_end]
        .iter()
        .cloned()
        .collect();

    let seeds: Vec<Vec<u8>> = vec![
        COMPOSABLE_POLICY_SEED.to_vec(),
        user_payment.as_ref().to_vec(),
        policy_id.to_le_bytes().to_vec(),
        vec![composable_policy_bump],
    ];
    let seed_slices: Vec<&[u8]> = seeds.iter().map(|s| s.as_slice()).collect();
    let signer_seeds: &[&[u8]] = &seed_slices;

    let instruction = anchor_lang::solana_program::instruction::Instruction {
        program_id: validation_program,
        accounts: val_accounts
            .iter()
            .map(|a| anchor_lang::solana_program::instruction::AccountMeta {
                pubkey: *a.key,
                is_signer: a.is_signer,
                is_writable: a.is_writable,
            })
            .collect(),
        data: val_data,
    };

    anchor_lang::solana_program::program::invoke_signed(
        &instruction,
        &val_accounts,
        &[signer_seeds],
    )?;

    Ok(val_accounts_end)
}

pub fn split_remaining_accounts<'info>(
    remaining_accounts: &'info [AccountInfo<'info>],
    num_validation_accounts: u8,
    has_validation: bool,
) -> (&'info [AccountInfo<'info>], &'info [AccountInfo<'info>]) {
    if !has_validation {
        return (&[], remaining_accounts);
    }
    let split = 1 + num_validation_accounts as usize;
    if split >= remaining_accounts.len() {
        (remaining_accounts, &[])
    } else {
        (&remaining_accounts[..split], &remaining_accounts[split..])
    }
}
```

Then refactor `execute_composable.rs` lines 263-348 to call `dispatch_validation_cpi` instead of inline logic.

**Why:** This is the correct long-term solution but requires more testing. The signature changed (added `composable_policy_key`, `composable_policy_bump`, `user_payment`, `policy_id`) since the original stub didn't have enough context to actually perform the CPI.

---

### Option D: Document as Intentional Placeholder

Add explicit comments and a README note marking the validation layer as unimplemented.

**`programs/tributary/src/shared/validation.rs` — Add comments:**

```diff
 use anchor_lang::prelude::*;

+/// VALIDATION CPI DISPATCH — UNIMPLEMENTED STUB
+///
+/// This function does NOT perform validation. It always returns Ok(()).
+/// The actual validation CPI is performed inline in execute_composable.rs.
+/// Do NOT call this function from any new code path.
+/// See: reports/H-05-validation-cpi-noop-stub.md
 pub fn dispatch_validation_cpi<'info>(
     _validation_config: &crate::state::composable_policy::ValidationConfig,
     _remaining_accounts: &[AccountInfo<'info>],
     _user_payment_owner: &Pubkey,
     _user_payment_mint: &Pubkey,
     _user_payment_bump: u8,
 ) -> anchor_lang::Result<()> {
+    // WARNING: This is a no-op. Do not rely on this for validation.
     Ok(())
 }

+/// UNUSED — kept for future validation account splitting.
+/// Not called from any current code path.
 pub fn split_remaining_accounts<'info>(
```

**`programs/tributary/README.md` or `docs/` — Add note:**

```markdown
## Validation Layer (Unimplemented)

The `shared/validation.rs` module exports `dispatch_validation_cpi` which is a
no-op stub. Validation CPI is performed inline in `execute_composable.rs`.
The shared function exists as a placeholder for future refactoring.

**Do not call `dispatch_validation_cpi` from new code.** It will not validate anything.
```

**Why:** Cheapest option, but comments rot and developers don't read READMEs. This is a band-aid, not a fix.

---

## Recommendation

**For mainnet: Combine Option A (remove stub) with Option B (fail-closed feature gate).**

The priority order:

1. **Delete `dispatch_validation_cpi` and `split_remaining_accounts`** from `shared/validation.rs` (or delete the file entirely). Dead code that looks functional is a hazard.
2. **Add a `ValidationCpiNotImplemented` error** to `TributaryError` so that if anyone re-adds a stub, it fails closed instead of open.
3. **Validate the `ALLOWED_VALIDATION_PROGRAMS` pubkey** — confirm it corresponds to a real, deployed, audited program. If it's a test key, remove it before mainnet.
4. **Optionally**, implement Option C (wire the shared function properly) if the team plans to add more execution paths that need validation.

The core issue isn't that validation doesn't work — the inline code in `execute_composable.rs` does call the validation program. The issue is that the shared API surface is a lie. Delete the lie.

---

## Testing Instructions

### Test 1: Verify Dead Code Removal

After applying Option A:

```bash
# Build should succeed
anchor build

# No references to the deleted module
grep -rn "dispatch_validation_cpi" programs/tributary/src/
# Expected: no output

grep -rn "split_remaining_accounts" programs/tributary/src/
# Expected: no output

# Module reference removed from shared/mod.rs
grep "validation" programs/tributary/src/shared/mod.rs
# Expected: no output
```

### Test 2: Composable Policy Execution Still Works

```bash
anchor test -- --grep "composable"
```

All existing composable tests should pass unchanged. The inline validation CPI path in `execute_composable.rs` is untouched.

### Test 3: Validation CPI Is Actually Invoked

Create a test that:

1. Creates a composable policy with `validation_program` set to the whitelisted key
2. Creates a `ValidationPda` with test data
3. Executes the composable policy
4. Confirms the CPI was attempted (check program logs for the invoke)

```bash
anchor test -- --grep "validation"
```

### Test 4: Fail-Closed Verification (If Option B Applied)

Create a test that:

1. Calls `dispatch_validation_cpi` directly (unit test)
2. Asserts it returns `Err(TributaryError::ValidationCpiNotImplemented)`

```bash
anchor test
```

### Test 5: Integration Test with Mock Validation Program

Deploy a minimal validation program to localnet that:

1. Accepts the CPI
2. Reads the validation data
3. Returns success/failure based on the data content

Then test the full flow: create policy → execute → verify validation program was called and its result was respected.

```bash
anchor test -- --features validation-cpi
```
