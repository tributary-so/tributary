---
# tributary-92e4
title: 'M-05: TokenAccountMap::load — Silent Skip of Non-Matching Accounts'
status: completed
type: task
priority: normal
tags:
    - security
    - audit
created_at: 2026-06-13T05:51:21Z
updated_at: 2026-06-18T10:07:45Z
parent: tributary-4kt4
---

# M-05: `TokenAccountMap::load` — Silent Skip of Non-Matching Accounts

| Field          | Value                                                     |
| -------------- | --------------------------------------------------------- |
| **Severity**   | Medium                                                    |
| **File**       | `programs/tributary/src/state/token_account_map.rs:11-45` |
| **Program ID** | `TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6X1Sg42tJ`              |
| **Framework**  | Anchor 0.31.1                                             |

---

## Description

`TokenAccountMap::load` iterates over remaining accounts and silently `continue`s past accounts that fail any of four checks:

```rust
// token_account_map.rs:18-36
for account_info in account_info_iter {
    if !account_info.is_writable {       // ← check 1: must be writable
        continue;
    }

    let data = match account_info.try_borrow_data() {
        Ok(d) => d,
        Err(_) => continue,              // ← check 2: must be readable
    };

    if data.len() < 72 {                 // ← check 3: minimum data length
        continue;
    }

    let mint_slice = array_ref![data, 32, 32];
    let account_mint = Pubkey::from(*mint_slice);

    if account_mint != expected_mint {    // ← check 4: mint must match
        continue;
    }

    // only reaches here if ALL checks pass
    let token_account =
        Account::try_from(account_info).map_err(|_| TributaryError::InvalidTokenAccount)?;
    map.0.insert(*account_info.key, token_account);
}
```

If a required token account is passed as **read-only**, has the **wrong mint**, or has **corrupted data** (length < 72), it is silently dropped. The function returns `Ok(map)` with no indication that accounts were skipped. The caller receives a partial or empty `TokenAccountMap` with **zero error signaling**.

This is a fail-open design. The only error path is `Account::try_from` failing _after_ all four checks pass — but by that point, the account has already been deemed valid by the preceding checks, so this error path is nearly unreachable.

---

## Attack Scenario

While `TokenAccountMap` is not currently invoked directly from `execute_payment` (which uses explicit `InterfaceAccount<TokenAccount>` constraints), it is exported as a public utility from `state/mod.rs` and is designed for use in `remaining_accounts` processing. Any instruction that relies on it in the future — or any code path in the referral system that adopts it — inherits this silent-failure behavior.

**Concrete scenario:**

1. A new instruction is added that uses `TokenAccountMap::load` to process dynamic fee recipient token accounts from `remaining_accounts`.

2. An integrator passes 3 token accounts: two writable with the correct mint, one read-only (a common mistake when constructing transactions programmatically).

3. The read-only account is silently skipped. The map contains only 2 of 3 expected entries.

4. Downstream code calls `map.get(&expected_key)` on the skipped account. Returns `None`. The code either:

   - **Panics** with an unwrap on a `None` value (program abort, payment fails with generic error).
   - **Silently omits** a transfer (funds go to the wrong place or are lost in accounting).

5. The transaction may still succeed — the payment executes, the event is emitted, but one fee transfer never happens. The gateway or protocol loses fee revenue with no on-chain trace of the failure.

**Current exposure:** `process_referral_rewards` in `utils.rs:248` does its own `remaining_accounts` parsing via `parse_remaining_accounts`, which _does_ validate strictly (errors on wrong mint, wrong writability). However, `TokenAccountMap` exists as the reusable, public abstraction and will be the natural choice for future token-account iteration — making this a latent defect.

---

## Impact

- **Silent fund misrouting:** If `TokenAccountMap` is used to resolve fee or reward recipients, skipped accounts mean transfers never happen. No error is thrown. Funds appear to process correctly on-chain, but expected recipients receive nothing.
- **Hard-to-debug failures:** The only symptom is "missing funds" or "wrong balance." The transaction succeeds. No error code, no event, no log. Root cause requires manual account-by-account comparison of transaction inputs vs. expected state.
- **Failed payments with misleading errors:** If downstream code expects a specific key in the map and uses `.unwrap()`, the program aborts with a generic panic — not the actual cause (wrong mint / read-only flag).
- **Fail-open design anti-pattern:** Security-critical account validation should be fail-closed. Any mismatch should be an explicit error, not a silent skip.

---

## Proof of Concept

```rust
// Construct a transaction that calls an instruction using TokenAccountMap::load
// Pass the expected token account as READ-ONLY:

let token_account_info = AccountInfo {
    key: &expected_token_pubkey,
    is_signer: false,
    is_writable: false,        // ← read-only, not writable
    lamports: 0,
    data: &valid_token_account_data,
    owner: &token_program_id,
    executable: false,
    rent_epoch: 0,
};

// TokenAccountMap::load iterates, hits `!account_info.is_writable` → continue
// Returns Ok(TokenAccountMap(BTreeMap::new()))  ← empty map, no error

// Downstream:
let ta = map.get(&expected_token_pubkey);  // → None
let amount = ta.unwrap().amount;           // → panic / generic error
```

**With wrong mint:**

```rust
// Pass a valid writable token account but with a different mint:
let token_account_data = make_token_account_data(
    owner,
    wrong_mint,    // ← different mint than expected
    amount,
);

// TokenAccountMap::load iterates:
//   is_writable: true  ✓
//   data len >= 72:    ✓
//   account_mint != expected_mint → continue
// Returns Ok(TokenAccountMap(BTreeMap::new()))  ← silently empty
```

---

## Patch

### 1. Add error variants

**File:** `programs/tributary/src/error.rs`

```diff
      #[msg("Composable policy not found")]
      ComposablePolicyNotFound,
+     #[msg("Token account is not writable")]
+     TokenAccountNotWritable,
+     #[msg("Token account data too short")]
+     TokenAccountDataTooShort,
+     #[msg("Token account mint mismatch")]
+     TokenAccountMintMismatch,
+     #[msg("Token account map count mismatch: expected N, got M")]
+     TokenAccountMapCountMismatch,
  }
```

### 2. Add `load_strict` to `TokenAccountMap`

**File:** `programs/tributary/src/state/token_account_map.rs`

```diff
  use crate::error::TributaryError;
- use anchor_lang::prelude::{Account, AccountInfo, Pubkey};
+ use anchor_lang::prelude::{Account, AccountInfo, Pubkey, msg};
  use anchor_lang::Result;
  use anchor_spl::token::TokenAccount;
  use arrayref::array_ref;
  use std::collections::BTreeMap;

  pub struct TokenAccountMap<'a>(pub BTreeMap<Pubkey, Account<'a, TokenAccount>>);

  impl<'a> TokenAccountMap<'a> {
+     /// Load token accounts from an iterator with **strict** validation.
+     ///
+     /// Unlike `load`, this method errors on any account that:
+     /// - is not writable
+     /// - has data too short to be a token account
+     /// - has a mint that does not match `expected_mint`
+     /// - fails deserialization
+     ///
+     /// Additionally validates that the final count matches `expected_count`.
+     /// Returns an error with a diagnostic message on any mismatch.
+     pub fn load_strict<'b: 'a>(
+         account_info_iter: &mut std::slice::Iter<'b, AccountInfo<'a>>,
+         expected_mint: Pubkey,
+         expected_count: usize,
+     ) -> Result<TokenAccountMap<'a>> {
+         let mut map = TokenAccountMap(BTreeMap::new());
+
+         for account_info in account_info_iter {
+             if !account_info.is_writable {
+                 msg!(
+                     "TokenAccountMap: account {} is not writable",
+                     account_info.key
+                 );
+                 return Err(TributaryError::TokenAccountNotWritable.into());
+             }
+
+             let data = account_info.try_borrow_data().map_err(|_| {
+                 msg!(
+                     "TokenAccountMap: cannot borrow data for account {}",
+                     account_info.key
+                 );
+                 TributaryError::InvalidTokenAccount
+             })?;
+
+             if data.len() < 72 {
+                 msg!(
+                     "TokenAccountMap: account {} data too short ({} bytes)",
+                     account_info.key,
+                     data.len()
+                 );
+                 return Err(TributaryError::TokenAccountDataTooShort.into());
+             }
+
+             let mint_slice = array_ref![data, 32, 32];
+             let account_mint = Pubkey::from(*mint_slice);
+
+             if account_mint != expected_mint {
+                 msg!(
+                     "TokenAccountMap: account {} mint mismatch (expected {}, got {})",
+                     account_info.key,
+                     expected_mint,
+                     account_mint
+                 );
+                 return Err(TributaryError::TokenAccountMintMismatch.into());
+             }
+
+             let token_account =
+                 Account::try_from(account_info).map_err(|_| {
+                     msg!(
+                         "TokenAccountMap: failed to deserialize account {}",
+                         account_info.key
+                     );
+                     TributaryError::InvalidTokenAccount
+                 })?;
+
+             map.0.insert(*account_info.key, token_account);
+         }
+
+         if map.0.len() != expected_count {
+             msg!(
+                 "TokenAccountMap: expected {} accounts, got {}",
+                 expected_count,
+                 map.0.len()
+             );
+             return Err(TributaryError::TokenAccountMapCountMismatch.into());
+         }
+
+         Ok(map)
+     }
+
      pub fn load<'b: 'a>(
          account_info_iter: &mut std::slice::Iter<'b, AccountInfo<'a>>,
          expected_mint: Pubkey,
      ) -> Result<TokenAccountMap<'a>> {
```

### 3. Add doc comment to `load` warning about silent behavior

**File:** `programs/tributary/src/state/token_account_map.rs`

```diff
  impl<'a> TokenAccountMap<'a> {
+     /// Load token accounts from an iterator, **silently skipping** accounts that
+     /// are not writable, have the wrong mint, or fail deserialization.
+     ///
+     /// **WARNING:** This is a fail-open design. Accounts that don't match are
+     /// silently dropped. Prefer `load_strict` for security-critical paths where
+     /// missing accounts must cause an explicit error.
      pub fn load<'b: 'a>(
```

---

## Summary of All Changes

```
error.rs                                 +8 lines   (4 new error variants)
state/token_account_map.rs              +68 lines   (load_strict method + doc comments)
```

No changes to existing call sites required — `load` remains backward-compatible. New code should use `load_strict`. Existing code using `load` should be migrated when touching those paths.

---

## Testing Instructions

### 1. Test `load_strict` rejects read-only accounts

```typescript
// Pass a valid token account as read-only to load_strict
// Expected: error with TokenAccountNotWritable (custom error code)
// Verify: no accounts loaded, transaction fails
```

### 2. Test `load_strict` rejects wrong mint

```typescript
// Pass a writable token account with mint B when expected_mint = A
// Expected: error with TokenAccountMintMismatch
// Verify: transaction fails with specific error, not generic InvalidTokenAccount
```

### 3. Test `load_strict` rejects count mismatch

```typescript
// Pass 2 valid writable token accounts with correct mint
// Call load_strict with expected_count = 3
// Expected: error with TokenAccountMapCountMismatch
// Verify: "expected 3 accounts, got 2" in program logs
```

### 4. Test `load_strict` succeeds with correct inputs

```typescript
// Pass 3 valid writable token accounts, all with correct mint
// Call load_strict with expected_count = 3
// Expected: Ok(TokenAccountMap) with 3 entries
// Verify: map.get() returns correct account for each key
```

### 5. Test backward compatibility of `load`

```typescript
// Existing behavior: pass mix of valid + invalid accounts to load()
// Expected: silent skip of invalid, returns map with only valid accounts
// Verify: no regression in existing tests
```

### 6. Run existing test suite

```bash
anchor test
```

All existing tests must pass. `load` is unchanged; `load_strict` is additive.

---

## References

- Silent skip pattern: `programs/tributary/src/state/token_account_map.rs:17-42`
- Token account layout (offset 32 = mint): [SPL Token Account Layout](https://spl.solana.com/token#token-account-layout)
- Fail-open vs fail-closed: [Solana Program Security Best Practices](https://solana.com/docs/programs/security)
- Strict parsing precedent in same codebase: `programs/tributary/src/utils.rs:336-385` (`parse_remaining_accounts` — errors on wrong mint, wrong writability, count mismatch)
