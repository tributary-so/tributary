# CF-011: `num_pinned_accounts` Not Bounds-Checked at Execute Time (Composable)

> **Severity:** 🔵 3 (LOW)  
> **Category:** Account Validation  
> **File:** `programs/tributary/src/instructions/composable/execute_composable.rs:256–266`  
> **Commit:** `4506a59b1cb33f70a5a83e899af14995361606e6`

---

## Description

In `run_validation_cpi`, `num_pinned_accounts` is read from the deserialized `ValidationPda` and used to index into `pinned_accounts: [Pubkey; MAX_PINNED_ACCOUNTS]` (where `MAX_PINNED_ACCOUNTS = 2`):

```rust
let num_pinned = validation_pda.num_pinned_accounts as usize;
require!(remaining.len() >= num_pinned, ...);
for (i, rem) in remaining.iter().enumerate().take(num_pinned) {
    require!(rem.key() == validation_pda.pinned_accounts[i], ...);
}
```

The value is validated to `≤ MAX_PINNED_ACCOUNTS` at **create time** (`create_composable_policy.rs:322–324`), but there is **no bounds check at execute time**. If account corruption or a future upgrade writes `num_pinned_accounts > 2`, the array access `pinned_accounts[i]` for `i ≥ 2` panics — halting the runtime.

## Exploit Scenario

Not directly exploitable — requires account-level corruption (PDA ownership model makes this difficult). Defense-in-depth gap only.

## Patch

```rust
let num_pinned = validation_pda.num_pinned_accounts as usize;
require!(
    num_pinned <= MAX_PINNED_ACCOUNTS,
    TributaryError::InvalidValidationPda
);
```
