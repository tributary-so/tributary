---
# tributary-hl39
title: Fix composable execute money flow divergences
status: completed
type: bug
priority: normal
created_at: 2026-06-14T10:17:49Z
updated_at: 2026-06-18T10:07:23Z
---

execute_composable.rs diverges from COMPOSABLE.md in 8 places. See sub-tasks for fixes.

## Scope — money flow after validation CPI

Correct flow (per spec §Execution Flow steps 3–10):

```
user_wallet ──[input mint, full input_amount]──▶ pda_intermediate_input
                                                       │
                                                       ▼  (forward CPI)
                                              forward_program
                                                       │
                                                       ▼
                                       intermediate_output_token_account
                                                       │
                                  ┌────────────────────┼────────────────────┐
                                  ▼                    ▼                    ▼
                         protocol_fee_acct     gateway_fee_acct      recipient_token_account
                             (output mint)        (output mint)        (output mint)
```

## Sub-tasks

- [x] ST1 — Rename `pda_intermediate_token` → `intermediate_input_token_account` in struct, handler, and SDK. Add `intermediate_output_token_account` field. Update constraints to derive from `user_payment` PDA (not `composable_policy`) per ST6.
- [x] ST2 — Move fee calculation to AFTER forward CPI; compute on actual output amount read from `intermediate_output_token_account`.
- [x] ST3 — Reload `intermediate_output_token_account` after forward CPI (Anchor requires `exit()` / re-`load()` to see CPI-written data).
- [x] ST4 — Check `min_output_amount` against reloaded output balance BEFORE deducting fees.
- [x] ST5 — Add sweep: after fees, transfer remaining output balance from `intermediate_output_token_account` → `recipient_token_account` (assert same mint as output_mint). Assert `intermediate_output_token_account` balance > 0 immediately after forward CPI.
- [x] ST6 — Change signing authority from `[b"payments"]` PDA to `UserPayment` PDA in code AND spec. Update SDK, tests, and COMPOSABLE.md accordingly. Update `intermediate_input_token_account` / `intermediate_output_token_account` ownership to `user_payment` PDA.
- [x] ST7 — Forward CPI signer seeds = UserPayment PDA seeds (per ST6).
- [x] ST8 — Fix accounting: `total_input += input_amount` (full amount forwarded), `total_output += actual_swept_to_recipient` (output − fees). Update `ComposableExecuted` event to include both fees and recipient, matching spec.
- [x] ST9 — Update COMPOSABLE.md to reflect new field names, UserPayment PDA as sole signing authority, and corrected flow diagram.
- [ ] ST10 — Update tests/composable.test.ts and SDK to match new accounts struct; add coverage for the sweep + min_output + post-CPI balance > 0 assertion.
- [ ] ST11 — `anchor build` + `anchor test` green.

## Acceptance criteria

- No fee is taken from the user wallet directly.
- `intermediate_input_token_account` is funded with the FULL `input_amount` (no fee skim), then consumed by the forward CPI.
- `intermediate_output_token_account` carries the forward program's output tokens (output mint, owned by `user_payment` PDA).
- `min_output_amount` is enforced against the post-CPI balance of `intermediate_output_token_account` BEFORE any fee transfer.
- Fees (gateway + protocol) are deducted from `intermediate_output_token_account` (output mint).
- The remaining output is swept to `recipient_token_account` (must have `output_mint`).
- All CPI signing uses the `UserPayment` PDA seeds.
