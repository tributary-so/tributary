---
# tributary-v6wj
title: 'H-07: Validation CPI Signer Pass-Through'
status: completed
type: bug
priority: high
created_at: 2026-06-17T18:37:48Z
updated_at: 2026-06-17T18:43:04Z
parent: tributary-4kt4
---

run_validation_cpi and run_forward_cpi blindly forward remaining_accounts is_signer flags to inner CPIs. Fee payer (a Signer) re-passed as remaining_account grants unintended signer authority to Lighthouse / Meteora-DLM callee. Sanitize AccountMeta construction per shared-base §5.3.

## TODO

- [x] Write failing Rust unit tests for sanitized validation AccountMeta builder (RED)
- [x] Write failing Rust unit tests for sanitized forward AccountMeta builder (RED)
- [x] Implement sanitization helpers + wire into run_validation_cpi / run_forward_cpi (GREEN)
- [x] `cargo test -p tributary --lib` green (34 passed: 31 existing + 3 new)
- [x] `anchor build` green (only pre-existing dead-code warnings from H-05 stub)
- [x] Update bean with Summary of Changes

## Summary of Changes

**H-07 fixed.** Validation and forward CPI builders no longer forward `is_signer` from `remaining_accounts`, closing the privilege-pass-through vector where the caller's `fee_payer` (or any other outer-tx Signer) could be re-passed as a remaining_account and grant the callee (Lighthouse / Meteora-DLM) unintended signer authority.

### Rust changes (`programs/tributary/src/instructions/composable/execute_composable.rs`)

- **New helper `build_validation_account_metas`** — pure function that maps a slice of `AccountInfo` to `AccountMeta` with both `is_signer` and `is_writable` hard-coded to `false`. Validation programs are read-only and never require a signer per shared-base §5.3.
- **New helper `build_forward_account_metas`** — pure function that takes the `user_payment_pda: Pubkey` and forces `is_signer: a.key == user_payment_pda`. Only the UserPayment PDA signs (its authority is established by `invoke_signed(&instruction, &infos, &[up_seeds])`). All other forwarded accounts — including a re-passed `fee_payer` — are forced to non-signer. `is_writable` is still forwarded verbatim because the Solana runtime already rejects any inner instruction claiming writable access not granted by the outer transaction (no privilege escalation possible).
- **`run_validation_cpi`** swapped its inline `AccountMeta` mapping for the new helper.
- **`run_forward_cpi`** signature gained a `user_payment_pda: Pubkey` parameter and swapped its inline mapping for the new helper. The currently-commented-out call site (Step 5, pending H-05) was updated to pass `ctx.accounts.user_payment.key()` so it is correct when re-enabled.

### Tests

Added a `#[cfg(test)] mod tests` block in the same file with three unit tests:

1. `validation_metas_strips_signer_and_writable` — verifies all three metas (signer+writable / writable-only / plain) collapse to non-signer non-writable; pubkeys preserved.
2. `forward_metas_only_signs_user_payment_pda` — verifies the UserPayment PDA stays signer, the `fee_payer` (passed as `is_signer: true` in outer tx) is demoted to non-signer, and writability is preserved.
3. `forward_metas_user_payment_not_in_set_is_all_non_signer` — when the UserPayment PDA is not in the forwarded set, nothing is a signer.

The helpers are extracted as pure functions specifically so they can be unit-tested without simulating a CPI — there is no on-chain way to observe the constructed `AccountMeta`s without a real callee, so isolation is necessary for RED-GREEN discipline.

### Verification

- `cargo test -p tributary --lib` → **34 passed** (31 pre-existing + 3 new). 0 failed.
- `anchor build` → success. Only warnings are pre-existing `dead_code`/`unused_variables` for the stubbed Step 5 forward path (tracked separately by bean `tributary-y35e`, H-05).
- No `lint` script is defined in root `package.json` despite `AGENTS.md` referencing it; skipped.

### Severity / Risk

Pure surgical refactor of the `AccountMeta` construction. No behavioral change for legitimate callers (UserPayment PDA continues to sign via `invoke_signed`). The only behavior change is privilege reduction — a re-passed Signer no longer reaches the callee as a signer. No existing test fixture or integration path is affected. Low risk.
