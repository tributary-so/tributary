---
# tributary-m5wy
title: 'CF-009: Token-2022 mints pass compatibility check but fail at CPI execution'
status: completed
type: bug
priority: normal
created_at: 2026-07-13T20:06:45Z
updated_at: 2026-07-13T20:45:19Z
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

## Summary of Changes

CF-009 remediation — Option A (reject all Token-2022 mints at the owner check). The bean's recommended Option B (full Token-2022 execution support via `Interface<'info, TokenInterface>`) is deferred as a feature; the ADR captures the restoration steps.

**Code:**
- `programs/tributary/src/shared/mint.rs` — `validate_mint_compatible` collapsed from a 6-extension TLV blocklist scan to a single owner comparison: reject iff `owner == spl_token_2022::ID`. This matches the program's actual CPI capability (`token_program: Program<'info, Token>` is legacy-only). Deleted the now-unreachable extension-check body and its imports (they were dead code under Option A; git history at commit `4506a59` + ADR-0012 preserve them for restoration). Tests: 8 → 3 (`allows_legacy_spl_token_mint`, `rejects_clean_token_2022_mint` [the CF-009 regression], `rejects_token_2022_mint_with_extension`).
- `programs/tributary/src/error.rs` — updated the `UnsupportedTokenExtension` `#[msg]` to reflect the new semantics (`"Token-2022 mints are not supported; only legacy SPL Token mints are accepted"`). Variant name unchanged for API stability. No TS/Rust consumers matched on the old string.

**Docs:**
- `apps/docs/adr/0012-…md` — rewritten. ADR-0012 originally chose blocklist-over-allowlist on the assumption that clean Token-2022 mints would execute; CF-009 proved that false. New content documents the Option-A reality, why the blocklist was abandoned, and the exact restoration steps when Token-2022 execution support lands (switch `token_program` to `Interface`, update CPI sites, restore the six-extension blocklist from git history).
- `AGENTS.md` — ADR-map row title updated: "Mint compatibility: legacy SPL Token only (Token-2022 rejected) _(amended by CF-009)_".

**Verification:** `cargo check --package tributary` clean; `cargo test --package tributary --lib` 184/184 pass (3 mint tests pass); `cargo clippy` introduces zero new warnings on touched files (7 pre-existing clippy lints live in unrelated files not touched by this bean — left for their respective beans' owners).

**Out of scope (noted, not fixed):**
- Pre-existing clippy `field_reassign_with_default` at `create_composable_policy.rs:715` — unrelated to CF-009, belongs to another bean's file.
- Stale per-call-site comments in `execute_payment.rs`/`execute_composable.rs`/`transfer.rs` justifying re-validation via "mutable Token-2022 extensions". The re-validation is still correct defense-in-depth; its specific rationale is now superseded by ADR-0012 rather than wrong. Left untouched to keep the audit-trail commit scoped.
- Dead `|| ata.owner == &token_2022::ID` branches in scheduler-ATA routing (`execute_payment.rs:284`, `execute_composable.rs:418`) — now unreachable since token-2022 mints are rejected upstream. Harmless; left for a cleanup pass.
