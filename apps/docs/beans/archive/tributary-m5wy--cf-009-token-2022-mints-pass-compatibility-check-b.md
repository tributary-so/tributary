---
# tributary-m5wy
title: 'CF-009: Token-2022 mints pass compatibility check but fail at CPI execution'
status: completed
type: bug
priority: normal
created_at: 2026-07-13T20:06:45Z
updated_at: 2026-07-14T07:01:01Z
parent: tributary-gq3x
---

# CF-009: Token-2022 Mints Pass Compatibility Check but Fail at CPI Execution

> **Severity:** 🔵 4 (LOW)
> **Category:** API Contract
> **Status:** Open
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Affected Code

**Files:**

- `programs/tributary/src/instructions/payment/execute_payment.rs:105` — `token_program: Program<'info, Token>`
- `programs/tributary/src/instructions/composable/execute_composable.rs:772` — same
- `programs/tributary/src/instructions/payment/transfer.rs:65` — same
- `programs/tributary/src/shared/mint.rs:32–63` — `validate_mint_compatible` allows clean Token-2022

---

## Root Cause

`validate_mint_compatible` checks Token-2022 extensions and **allows** mints without dangerous extensions (TransferHook, ConfidentialTransfer, NonTransferable, PermanentDelegate, TransferFeeConfig, MintCloseAuthority). A Token-2022 mint with no extensions passes the check.

But `token_program` in every execution instruction is typed as `Program<'info, Token>` — the **legacy SPL Token program only**. When a Token-2022 mint is used:

1. The `transfer_checked` CPI targets `TokenkegQfeZyNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` (legacy)
2. The legacy Token program rejects accounts it doesn't own (Token-2022 accounts are owned by `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)
3. Every execution fails

Users can create UserPayment and PaymentPolicy accounts with Token-2022 mints (creation doesn't use `token_program` for CPI), pay rent, and then discover they can never execute — permanent fund lockup until they delete the accounts.

---

## Exploit Scenario

```
1. User creates UserPayment with token_mint = a clean Token-2022 mint
   → validate_mint_compatible passes (no dangerous extensions)
   → rent paid for UserPayment PDA

2. User creates PaymentPolicy under this UserPayment
   → rent paid for PaymentPolicy PDA

3. User approves delegate on their Token-2022 token account

4. User or gateway calls execute_payment
   → token_program = Token (legacy)
   → CPI: token::transfer_checked(...)
   → Token program: "AccountNotOwned" — the token account is owned by Token-2022
   → Transaction fails

5. Every future execution fails identically.
   User must delete PaymentPolicy + UserPayment (recovering rent) and start over.
```

No fund theft — the user's tokens are safe. But the UX is broken and rent is temporarily locked.

---

## Impact Assessment

| Dimension     | Value                                                                |
| ------------- | -------------------------------------------------------------------- |
| **Fund loss** | None — user recovers rent by deleting accounts                       |
| **UX impact** | Users who use Token-2022 mints are silently locked out of execution  |
| **Scope**     | Any token minted via Token-2022 (increasingly common for new tokens) |

---

## Patch

### Option A — Reject all Token-2022 mints (simplest, safe)

```diff
 // programs/tributary/src/shared/mint.rs

 pub fn validate_mint_compatible(mint_info: &AccountInfo) -> Result<()> {
-    if *mint_info.owner != anchor_spl::token_2022::ID {
+    // Only legacy SPL Token mints are supported. Token-2022 mints — even
+    // clean ones — are rejected because the program's token_program
+    // field is typed as Program<'info, Token> (legacy only).
+    if *mint_info.owner != anchor_spl::token::ID {
         return Ok(());
     }
+    // Token-2022 mint:
+    return Err(TributaryError::UnsupportedTokenExtension.into());
+
+    // (The extension-specific checks below are now unreachable, but
+    // retained for documentation / future Token-2022 support.)

     // ... existing extension checks ...
```

### Option B — Support Token-2022 (requires more changes)

Change `token_program` to `Interface<'info, TokenInterface>` in all execution instructions, update all CPI calls to use the interface, and derive intermediate ATAs using the correct token program. This is a larger change that enables Token-2022 support properly.

**Recommendation:** Option A as an immediate fix (prevents the lockup). Option B as a feature addition if Token-2022 support is desired.

## Summary of Changes — Option B (Token-2022 support)

CF-009 implemented as Option B (full Token-2022 support) instead of the previously-applied Option A (reject all Token-2022).

### Changes

1. **3 execution instructions** — `token_program` field switched from `Program<'info, Token>` (legacy-only) to `Interface<'info, TokenInterface>` (accepts both Token and Token-2022):
   - `programs/tributary/src/instructions/payment/transfer.rs`
   - `programs/tributary/src/instructions/payment/execute_payment.rs`
   - `programs/tributary/src/instructions/composable/execute_composable.rs`

2. **Imports** — `use anchor_spl::token::Token` → `use anchor_spl::token_interface::TokenInterface` in all 3 files.

3. **No CPI changes needed** — all transfer/close CPI calls already dispatched through `token_interface::*`. The migration was already done in the CPI layer; only the Anchor account validation (`Program<Token>`) was blocking Token-2022.

4. **Ownership checks** — both execution paths already accepted `token::ID || token_2022::ID` for scheduler-ATA validation (CF-008 fix).

5. **`validate_mint_compatible`** — extension blocklist is the active defense (restored by the Option A revert commit `6a4a355b`). Clean Token-2022 mints now flow through the full create → delegate → execute lifecycle.

6. **ADR-0012** — added "Amendment (CF-009 Option B)" section documenting the Interface switch.

7. **No qed hash update needed** — the qed attributes only validate function body hash, not accounts-struct hash. Function bodies unchanged.

### Why Option B was low-risk

The CPI layer was already Token-2022-compatible (`token_interface::*` everywhere). The only blocker was Anchor's `Program<Token>` validation, which rejects Token-2022 at the account-validation layer before any CPI runs. Switching to `Interface<TokenInterface>` lifts that gate — everything downstream was already ready.

All 195 lib tests pass.
