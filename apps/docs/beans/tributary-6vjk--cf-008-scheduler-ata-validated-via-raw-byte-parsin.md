---
# tributary-6vjk
title: 'CF-008: Scheduler ATA validated via raw byte parsing without token-program ownership check'
status: todo
type: bug
priority: high
created_at: 2026-07-13T20:06:45Z
updated_at: 2026-07-13T20:06:45Z
parent: tributary-gq3x
---

# CF-008: Scheduler ATA Validated via Raw Byte Parsing Without Token-Program Ownership Check

> **Severity:** 🟡 5 (MEDIUM)
> **Category:** Account Validation
> **Status:** Open
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Affected Code

**Files:**

- `programs/tributary/src/instructions/payment/execute_payment.rs:276–291`
- `programs/tributary/src/instructions/composable/execute_composable.rs:411–426`

```rust
let sta_data = scheduler_ata.try_borrow_data()?;
require!(sta_data.len() >= 64, TributaryError::InvalidSchedulerFeeAccount);
let sta_mint = Pubkey::try_from(&sta_data[0..32]).unwrap_or_default();
let sta_owner = Pubkey::try_from(&sta_data[32..64]).unwrap_or_default();
require!(sta_mint == expected_mint, TributaryError::InvalidSchedulerFeeAccount);
require!(sta_owner == fee_payer_key, TributaryError::InvalidSchedulerFeeAccount);
// NO check: scheduler_ata.owner == token_program || scheduler_ata.owner == token_2022
```

---

## Root Cause

When routing the scheduler fee cut to the permissionless caller's ATA, the account is validated by manually deserializing raw bytes at fixed offsets (0..32 = mint, 32..64 = owner). This bypasses Anchor's typed-account ownership verification.

Without checking that the account is owned by the SPL Token program or Token-2022 program, a non-token account could pass the mint/owner check if its raw data happens to have matching bytes at those offsets. The subsequent `transfer_checked` CPI provides a backstop (the Token program rejects transfers to accounts it doesn't own), but the pattern is fragile.

---

## Exploit Scenario

```
1. Attacker creates an arbitrary account owned by an arbitrary program.
   The account's raw data is crafted so bytes [0..32] = expected_mint
   and bytes [32..64] = attacker's public key.

2. Attacker calls execute_composable (permissionless path) with this
   account as the scheduler ATA in remaining_accounts.

3. The raw byte validation passes:
   sta_data[0..32] == expected_mint ✓
   sta_data[32..64] == fee_payer_key ✓

4. The transfer_checked CPI is invoked with this account as the destination.
   The Token program rejects the transfer because it doesn't own the account.
   → Transaction fails.

   Impact: wasted compute units (DoS on the specific execution attempt).
   No fund theft possible.
```

The practical impact is limited because `transfer_checked` is the actual fund-moving operation and it validates ownership internally. But the defense-in-depth principle says: validate the account type before the CPI, not rely on the CPI to reject it.

---

## Impact Assessment

| Dimension     | Value                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| **Fund loss** | None — Token program's `transfer_checked` rejects non-token-account destinations                     |
| **DoS**       | Minor — a crafted account wastes compute units before the CPI fails                                  |
| **Risk**      | Low but defense-in-depth gap. If Token program semantics change (unlikely), this becomes exploitable |

---

## Patch

```diff
 // programs/tributary/src/instructions/payment/execute_payment.rs:276–291

 let sta_data = scheduler_ata.try_borrow_data()?;
+// Verify the account is owned by a token program before parsing raw bytes.
+require!(
+    scheduler_ata.owner == &anchor_spl::token::ID
+        || scheduler_ata.owner == &anchor_spl::token_2022::ID,
+    TributaryError::InvalidSchedulerFeeAccount
+);
 require!(sta_data.len() >= 64, TributaryError::InvalidSchedulerFeeAccount);
 let sta_mint = Pubkey::try_from(&sta_data[0..32]).unwrap_or_default();
 let sta_owner = Pubkey::try_from(&sta_data[32..64]).unwrap_or_default();
```

Apply the same fix to `execute_composable.rs:411–426`.

**Alternative (cleaner):** Use `InterfaceAccount<'info, TokenAccount>` instead of raw byte parsing. However, since the scheduler ATA is in `remaining_accounts` (not a named field in the Accounts struct), this requires either promoting it to a named field or using `load()` on the InterfaceAccount.
