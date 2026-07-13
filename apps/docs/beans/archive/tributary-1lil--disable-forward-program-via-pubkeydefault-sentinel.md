---
# tributary-1lil
title: Disable forward program via Pubkey::default() sentinel (topup support)
status: completed
type: feature
priority: high
created_at: 2026-06-23T09:32:13Z
updated_at: 2026-06-23T10:12:04Z
---

Allow a composable policy to run WITHOUT a forward CPI by setting forward_config.target_program = Pubkey::default(). This mirrors the validation_program sentinel pattern and enables the simple cold→hot USDC topup flow in tests/topup-balance.test.ts without the METEORA placeholder + fake byte-range check hack.

Replaces the dangerous alternative of allowing tokenProgram as a forward target (gateway could redirect the sweep to any unvalidated to-account).

TDD: RED → GREEN → REFACTOR.

## Tasks

- [ ] Add `ForwardDisabledRequiresSameMint` error variant (cross-mint guard)
- [ ] create_composable_policy: allow `Pubkey::default()` forward sentinel + make data-check requirements conditional (num_data_checks == 0 when disabled) + cross-mint guard
- [x] execute_composable: gate `validate_byte_ranges` + `run_forward_cpi` on `target_program != Pubkey::default()`
- [ ] Update tests/topup-balance.test.ts: disabled-forward config (drop METEORA placeholder + fake discriminator hack), empty instruction_data, remaining_accounts = validation only
- [ ] Build (cargo check) + lint
- [x] Run topup-balance test against surfpool — 5/5 pass

## Summary of Changes

```
topup flow (forward disabled, same mint):

  user_token ──pull──▶ intermediate (=input=output)
                            │
                            ├── fee    ▶ protocol_fee_account  (pinned)
                            ├── fee    ▶ gateway_fee_account    (pinned)
                            └── sweep  ▶ recipient_token_account (pinned)
                            └── close  ▶ fee_payer (rent)
```

Forward is disabled via `target_program = Pubkey::default()` — the same sentinel pattern validation_program already uses. This avoids the dangerous alternative (allowing tokenProgram as a forward target), which would let the gateway redirect the sweep to any unvalidated `to`-account.

### Rust (program)
- `error.rs`: added `ForwardDisabledRequiresSameMint` variant (cross-mint guard).
- `create_composable_policy.rs`: extracted `validate_forward_config()` testable seam. Allows the sentinel, requires `num_data_checks == 0` + `input_mint == output_mint` when disabled, keeps the allowlist + `>=1` check + discriminator-pin when enabled. Added 6 unit tests.
- `execute_composable.rs`: `validate_byte_ranges` + `run_forward_cpi` now gated on `target_program != Pubkey::default()`. Forward CPI re-enabled (was commented out) but skipped for the disabled path; the same-mint pull→sweep reads the funded intermediate directly.

### TypeScript (test)
- `topup-balance.test.ts`: `targetProgram: PublicKey.default`, `numDataChecks: 0`, empty `instruction_data`, `remaining_accounts` = validation only. Dropped METEORA placeholder + fake discriminator byte-range hack + unused `buildTokenTransferInstructionData` helper + unused `METEORA_DLMM_PUBKEY` import.

### Verification
- cargo test: 57/57 pass (was 51; +6 new forward-config tests)
- cargo fmt: clean
- tsc (test file): clean
- Integration: `topup-balance.test.ts` 5/5 pass against surfpool (create gateway, create user payment, create disabled-forward policy, execute topup succeeds, re-execute fails on Lighthouse threshold)

### Note on scope
`validate_forward_config` was extracted from the inline handler to enable Rust-level unit verification of the new branching logic (the Anchor handler is hard to exercise without a validator). The per-check sanity loop + discriminator-pin remain inline in the handler (unchanged logic).
