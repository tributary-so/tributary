---
# tributary-kymx
title: 'CF-023: Native output close sends rent to recipient instead of fee payer'
status: completed
type: bug
priority: low
created_at: 2026-07-13T20:06:45Z
updated_at: 2026-07-14T06:46:13Z
parent: tributary-gq3x
---

# CF-023: Native Output Close Sends Rent to Recipient Instead of Fee Payer

> **Severity:** ⚪ 2 (INFO)
> **Category:** Economic / State Machine
> **File:** `programs/tributary/src/instructions/composable/execute_composable.rs:519–526`
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Description

In `sweep_output_to_recipient` with `native_output = true`, the WSOL intermediate is closed via `closeAccount` with `destination = recipient_token_account`:

```rust
if native_output {
    close_token_account(
        intermediate_output,
        recipient_token_account,  // ← rent goes here
        ...
    )?;
}
```

`closeAccount` transfers **all** lamports (token balance + rent-exempt minimum) to the destination. The rent (~0.00203928 SOL) was paid by `fee_payer` at ATA creation. In the non-native path, the output ATA is closed separately with rent going to `fee_payer_info`. But the native path closes during the sweep with rent going to the recipient.

## Impact

Fee_payer loses ~0.002 SOL per native-output execution. Recipient gets a small bonus. Not exploitable for meaningful theft.

## Patch

```diff
 if native_output {
+    // Transfer the WSOL token balance to the recipient via transfer_checked
+    let balance = intermediate_output_lamports_or_amount;
+    transfer_checked(intermediate_output, recipient_token_account, balance, ...)?;
+    // Then close the ATA to fee_payer for the rent refund
+    close_token_account(
+        intermediate_output,
+        fee_payer_info,  // ← rent back to fee_payer
+        ...
+    )?;
-    close_token_account(
-        intermediate_output,
-        recipient_token_account,
-        ...
-    )?;
 }
```

Or accept the small rent discrepancy and document it as a design choice.

## Summary of Changes

CF-023 fixed in `programs/tributary/src/instructions/composable/execute_composable.rs` (`sweep_output_to_recipient`):

- Native-output path now `transfer_checked`s the WSOL token balance to the recipient first, then `close_token_account`s the ATA to `fee_payer_info` for the rent refund. Previously `closeAccount` sent both balance + rent to the recipient, costing the fee_payer ~0.002 SOL per native-output execution.
- Added `fee_payer_info` parameter to `sweep_output_to_recipient` (9 params, single call site — ponytail comment updated).
- The downstream skip at `&& !native_output` (line ~1498) still correctly prevents a double-close — the sweep closes during settlement either way; only the destination changed (recipient → fee_payer).
- The post-sweep output-balance check at `needs_output_ata && !native_output` is already skipped for native output, so the closed ATA doesn't trigger a false read error.

All 190 lib tests pass.
