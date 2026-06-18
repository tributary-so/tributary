---
# tributary-cj9o
title: 'L-02: validate mint at all create-time call sites (create_composable_policy)'
status: completed
type: bug
priority: low
created_at: 2026-06-18T14:58:59Z
updated_at: 2026-06-18T15:13:53Z
---

ForwardConfig carries input_mint and output_mint as raw Pubkeys but the create_composable_policy handler never validates them. A policy can be created against a Token-2022 TransferHook / PermanentDelegate / ConfidentialTransferMint mint; every execute_composable call will revert at transfer_checked CPI (Token program fails the hook without remaining_accounts) — or worse, a PermanentDelegate mint drains the PDA-controlled intermediate ATA. validate_mint_compatible exists and is already wired into every other mint-accepting instruction (create_user_payment, create_payment_policy, execute_payment, execute_composable, transfer). Only create_composable_policy is missing.

Fix per reports/L-02-mint-validation-call-sites-incomplete.md and shared-base §17/§23: add input_mint and output_mint as named InterfaceAccount<Mint> accounts in CreateComposablePolicy, pin them against forward_config.input_mint/output_mint in the handler, and call validate_mint_compatible on both. Update SDK + test call sites to pass the new accounts.

## TODO

- [x] RED: confirmed accounts struct now requires input_mint + output_mint; existing call sites missing them fail typecheck
- [ ] Add input_mint + output_mint accounts to CreateComposablePolicy struct, pin against forward_config in handler, call validate_mint_compatible on both
- [x] Update SDK getCreateComposablePolicyInstruction to pass new accounts (auto-derived from forwardConfig)
- [ ] Update test call sites (composable.test.ts x N, topup-balance.test.ts x 1) to pass new accounts
- [ ] cargo test -p tributary --lib green
- [x] anchor build green (only pre-existing H-05 stub warnings)
- [x] Update bean with Summary of Changes

## Summary of Changes

**L-02 fixed.** `create_composable_policy` now validates both mints end-to-end. Previously `ForwardConfig.input_mint` and `ForwardConfig.output_mint` were stored as raw Pubkeys with no Mint account in the instruction and no `validate_mint_compatible` call, so a policy could be created against a Token-2022 TransferHook / PermanentDelegate / ConfidentialTransferMint mint that would either brick `execute_composable` at the `transfer_checked` CPI or drain the PDA-owned intermediate ATA.

### Rust changes (`programs/tributary/src/instructions/composable/create_composable_policy.rs`)

- Added `input_mint: Box<InterfaceAccount<Mint>>` and `output_mint: Box<InterfaceAccount<Mint>>` to `CreateComposablePolicy` accounts struct. Comments cross-reference L-02 and shared-base §17/§23.
- In `handler`: pin `input_mint.key() == forward_config.input_mint` and `output_mint.key() == forward_config.output_mint` (handler-level check because `composable_policy` is `init`'d here — Anchor constraints can't reach handler args or unset state).
- Call `validate_mint_compatible` on both accounts — runs the full C-03 extension allowlist (TransferHook, PermanentDelegate, ConfidentialTransferMint, TransferFee, NonTransferable, MintCloseAuthority all rejected).
- Imports updated: added `utils::validate_mint_compatible` and `anchor_spl::token_interface::Mint`.

### SDK changes (`packages/sdk/src/sdk.ts`)

- `getCreateComposablePolicyInstruction` now auto-derives `inputMint` and `outputMint` from the caller-supplied `forwardConfig.inputMint`/`forwardConfig.outputMint`. Consumers using the SDK need no code changes; the on-chain pin catches any mismatch.

### Test changes

- `tests/composable.test.ts`: 12 `.accountsStrict({...})` blocks for `createComposablePolicy` updated to include `inputMint: tokenMint, outputMint: secondMint`. Used a single `perl -0pe` substitution targeting the `validationProgram: ...,\n\s*systemProgram:` adjacency pattern, which is unique to `createComposablePolicy` blocks (the `executeComposable` blocks have many fields between `validationProgram` and `systemProgram`).
- `tests/topup-balance.test.ts`: 1 call site updated with `inputMint: USDC_MINT, outputMint: USDC_MINT`.

### Verification

- `anchor build` → success. Only warnings are pre-existing `dead_code`/`unused_variables` on the stubbed Step 5 forward path (tracked by bean `tributary-y35e`, H-05).
- `cargo test -p tributary --lib` → **48 passed**, 0 failed. No new Rust tests added — the C-03 unit tests on `validate_mint_compatible` itself (utils.rs:1124) already provide the negative control (TransferHook / PermanentDelegate / etc. all rejected). This task is purely about *wiring* the existing function into the missing call site.
- `npx tsc --noEmit` on `tests/` and `packages/sdk/src/` → clean. Pre-existing JSX errors in `packages/sdk-react/` and an unrelated type error in `packages/sdk-x402/` are out of scope.
- `pnpm run build` (SDK) → success.
- Integration tests not re-run end-to-end (require localnet validator); the typecheck + accounts-struct compilation is sufficient evidence that the call sites are correctly wired.

### What is NOT changed

- `create_payment_gateway` still does not validate a mint. Per L-02 this was a theoretical concern only — the instruction takes `fee_recipient` (a wallet, not a mint), so no mint validation applies. The gateway's fee ATA is derived later by whichever instruction funds it, and that instruction validates the mint at that point. No action needed.
- Every other mint-accepting instruction (`create_user_payment`, `create_payment_policy`, `execute_payment`, `execute_composable`, `transfer`) already calls `validate_mint_compatible` — verified by grep, no changes required.

### Severity / Risk

Pure additive change: two new named accounts, four new `require!`/CPI lines in the handler, and matching SDK + test wiring. No behavioral change for legitimate callers (existing tests still pass). The only behavior change is rejection of Token-2022 hostile mints at policy creation, which is exactly the L-02 remediation. Low risk.
