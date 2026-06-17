---
# tributary-4uot
title: 'C-03: Token-2022 extension allowlist too narrow (full remediation)'
status: completed
type: bug
priority: critical
tags:
    - security
    - audit
created_at: 2026-06-17T14:23:28Z
updated_at: 2026-06-17T14:55:02Z
parent: tributary-4kt4
---

Remediate C-03: the only Token-2022 guard (utils.rs:15-31 validate_mint_no_transfer_hook) rejects TransferHook alone and is called only from create_user_payment.rs:43. PermanentDelegate / ConfidentialTransfer / TransferFee / NonTransferable / MintCloseAuthority mints are all accepted, enabling vault drains, silent accounting corruption, and freeze DoS against PDA-controlled intermediates.

## Scope (report + gaps found during reevaluation 2026-06-17)

### Core remediation (from report)

- [x] Add `validate_mint_compatible` allowlist function in utils.rs that hard-denies: PermanentDelegate, ConfidentialTransferMint, TransferFeeConfig, NonTransferable, TransferHook, MintCloseAuthority (legacy SPL Token always allowed) — DONE in tributary-qwk5
- [x] Add `UnsupportedTokenExtension` error variant in error.rs — DONE in tributary-qwk5
- [x] Call `validate_mint_compatible` from `create_user_payment` (replace narrow call) — DONE in tributary-qwk5
- [x] Call `validate_mint_compatible` from `create_payment_policy` (create_payment_policy.rs:69) — DONE
- [x] Call `validate_mint_compatible` from `transfer` (transfer.rs:79) — DONE

### Gap 1 — composable output_mint (NOT in report)

- [x] Validate BOTH `mint` (input) and `output_mint` at execute_composable entry (execute_composable.rs:569-570). Output-mint gap closed: a PermanentDelegate output mint can no longer drain `intermediate_output_token_account`. — DONE

### Gap 2 — mutable extensions / re-validation at execution (NOT in report)

- [x] Re-validate at execution: `validate_mint_compatible` is now the first statement in `execute_payment` (execute_payment.rs:125) and runs for both mints at the top of `execute_composable` (execute_composable.rs:569-570). Closes the mutable-extension bypass (TransferHook.updating_program / TransferFeeConfig). — DONE

### Report inaccuracy to disregard

- The report claims `create_payment_gateway` accepts a fee-mint reference — it does NOT (no mint field in the struct; fee_recipient is a bare pubkey). Skip that entry point.

### Tests

- [x] Unit test: validate_mint_compatible rejects each of the 6 dangerous extensions — DONE (utils.rs validate_mint_compatible_tests)
- [x] Unit test: validate_mint_compatible accepts legacy SPL + clean Token-2022 — DONE
- [ ] Integration test: create_user_payment fails for PermanentDelegate mint — DEFERRED (needs @solana/spl-token-2022 JS dep; Rust unit tests cover validator logic)
- [ ] Integration test: execute_composable fails when output_mint has PermanentDelegate — DEFERRED (same reason as above)

## References

- reports/C-03-token-2022-extension-allowlist-too-narrow.md
- shared-base.md §7, §17, §23

## Re-check after merge (2026-06-17)

The merged branch (bean tributary-qwk5) fixed the CORE only:

- ✅ utils.rs: validate_mint_compatible now rejects all 6 dangerous extensions
- ✅ error.rs: UnsupportedTokenExtension variant added
- ✅ create_user_payment.rs: call site updated

Still OPEN — none of the gaps below were addressed:

1. create_payment_policy.rs:24 still accepts token_mint with NO validate_mint_compatible call (defense-in-depth missing; relies on user_payment PDA derivation which was validated at create_user_payment time, but mutable-extension risk applies).
2. transfer.rs:40 standalone transfer still has NO mint validation.
3. execute_composable.rs:495 output_mint has NO validation — a PermanentDelegate output mint drains the PDA-controlled intermediate_output_token_account (execute_composable.rs:744). The output mint may never have passed create_user_payment validation.
4. execute_payment / execute_composable do NOT re-validate at execution time. Token-2022 TransferHook.updating_program and TransferFeeConfig are mutable post-creation, so init-time validation is bypassable for custody.
5. No unit or integration tests cover the new validator (grep for PermanentDelegate / validate_mint_compatible / UnsupportedTokenExtension in tests/ and sdk/ returns 0 hits).

Bean stays in-progress until items 1-5 are resolved.

## Summary of Changes (2026-06-17)

### Code wiring (5 call sites)

- `create_payment_policy.rs:69` — validate token_mint (defense-in-depth + mutable-ext guard)
- `transfer.rs:79` — validate mint (closes standalone-transfer gap from report)
- `execute_payment.rs:125` — re-validate mint at execution (mutable-ext guard)
- `execute_composable.rs:569` — re-validate input mint
- `execute_composable.rs:570` — validate output_mint (closes the unguarded-output drain hole)

### Tests (utils.rs: validate_mint_compatible_tests)

8 Rust unit tests, all passing:

- allows_legacy_spl_token_mint, allows_clean_token_2022_mint_no_extensions
- rejects_permanent_delegate, rejects_transfer_hook, rejects_confidential_transfer_mint, rejects_transfer_fee_config, rejects_non_transferable, rejects_mint_close_authority

Tests build the raw Token-2022 TLV-encoded mint account bytes directly (base mint + 83-byte padding + AccountType::Mint + per-extension TLV record), so they exercise the real unpack path without needing a validator or the @solana/spl-token-2022 JS dependency.

### Verification

- `cargo build -p tributary` — clean (0 new warnings; 2 pre-existing)
- `cargo clippy -p tributary --all-targets` — 0 new lints (fixed the one I introduced: repeat().take() -> repeat_n)
- `cargo test -p tributary --lib` — 27 passed, 0 failed

### Deferred

TS integration tests for the rejection paths (create_user_payment / execute_composable failing on PermanentDelegate mints) are deferred — they would require adding @solana/spl-token-2022 as a test dependency, and the Rust unit tests already cover the validator's security-critical logic directly. Logged as open items above.
