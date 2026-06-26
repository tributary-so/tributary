---
# tributary-rb3p
title: Move validation_program from handler arg to account
status: completed
type: task
priority: high
created_at: 2026-06-16T20:02:42Z
updated_at: 2026-06-16T20:30:30Z
---

Move validation_program from a handler argument to an UncheckedAccount in the accounts struct for create_composable_policy and execute_composable. Fixes CPI bug where validation program was never in invoke_signed account_infos.

## TODO
- [x] lib.rs: remove validation_program: Pubkey from create_composable_policy signature
- [x] create_composable_policy.rs: add validation_program UncheckedAccount to struct, remove from handler args, use ctx.accounts key
- [x] execute_composable.rs: add validation_program UncheckedAccount to struct, cross-check vs stored config, fix run_validation_cpi to include program in invoke_signed
- [x] topup-balance.test.ts: move LIGHTHOUSE_PUBKEY from method arg to accountsStrict in create + both execute tests
- [x] sdk.ts: move validationProgram from method args to accounts dict
- [x] Build + verify

## Summary of Changes

Moved `validation_program` from a handler argument to an `UncheckedAccount` in the accounts struct for both `create_composable_policy` and `execute_composable`.

**Files changed:**
- `lib.rs`: Removed `validation_program: Pubkey` from create_composable_policy signature
- `create_composable_policy.rs`: Added `validation_program: UncheckedAccount` to struct; handler now reads key from account; `has_validation` determined via `ALLOWED_VALIDATION_PROGRAMS.contains()`; stores `ValidationConfig::default()` when no validation
- `execute_composable.rs`: Added `validation_program: UncheckedAccount` to struct; cross-checks passed account against stored `validation_config.validation_program`; **fixed CPI bug** — `run_validation_cpi` now includes the validation program AccountInfo in `invoke_signed` account_infos (was missing before, causing CPI to fail)
- `tests/topup-balance.test.ts`: Moved `LIGHTHOUSE_PUBKEY` from method arg to `accountsStrict` `validationProgram` field
- `packages/sdk/src/sdk.ts`: Moved `validationProgram` from method args to accounts dict

**Convention:** Pass SystemProgram as `validation_program` when no validation is configured.
