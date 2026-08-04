---
# tributary-brp6
title: 'Program contract: composable fee rebase to input-side'
status: completed
type: feature
priority: high
created_at: 2026-07-05T07:47:52Z
updated_at: 2026-07-06T07:15:37Z
parent: tributary-wsq4
---

Implement the on-chain changes for the composable fee rebase (milestone tributary-t6gt).

Acceptance criteria:
- [ ] execute_composable.rs: insert a fee-skim phase between PULL and FORWARD — compute fees on (face = input_amount) via calculate_fees(..., is_net=true), transfer_checked fee cuts from intermediate_input to gateway_fee_account / protocol_fee_account / scheduler_ata (now input_mint-denominated).
- [ ] process_output_and_sweep: stop computing fees; refactor to only sweep intermediate_output → recipient AND intermediate_input residual → user (asset separation per Q4).
- [ ] Accounts struct: flip gateway_fee_account / protocol_fee_account constraints from output_mint → input_mint (mint + owner checks). scheduler_ata validation in handler flips likewise.
- [ ] create_composable_policy: reject forward_disabled && output_mint != input_mint. Accept output_mint == Pubkey::default() (act-mode sentinel).
- [ ] handler: mode-conditional require!(output_amount > 0) — enforced when output_mint != sentinel, skipped when sentinel. Skip output-ATA creation + deliver sweep in act mode. Accept SystemProgram as output_mint account in act mode.
- [ ] validate_policy_execution / advance_policy: PayAsYouGo max_chunk_amount and max_amount_per_period checks bind on GROSS (face + fee), not face. Period accumulator runs on gross.
- [ ] delegate check: delegated_amount >= face + fee (gross).
- [ ] ComposableExecuted event: add gross_pulled, fee_basis (face), input_residual_returned fields. Keep output_amount (0 in act mode).
- [ ] constants.rs: document act-mode sentinel for output_mint.
- [ ] Lint + anchor test green.

Parent epic: tributary-wsq4. Blocked-by: nothing (this is the source of truth for SDK + tests).

## Summary of Changes

Implemented in commit 9bc9e8a (merged to develop via be75651). Verified 2026-07-06:
- execute_composable.rs: fee-skim phase inserted between PULL and FORWARD (gross pull = face + fee, skimmed from intermediate_input before forward). refs execute_composable.rs:339, 966, 1195.
- process_output_and_sweep refactored: sweeps intermediate_output -> recipient AND intermediate_input residual -> user (asset separation, execute_composable.rs:530).
- Accounts constraints flipped output_mint -> input_mint for gateway_fee_account / protocol_fee_account / scheduler_ata.
- create_composable_policy: rejects forward_disabled && output_mint != input_mint; accepts output_mint == Pubkey::default() (act-mode sentinel).
- Mode-conditional require!(output_amount > 0): enforced in deliver mode, skipped in act mode (is_act_mode, execute_composable.rs:779). SystemProgram accepted as output_mint account in act mode; output-ATA creation + deliver sweep skipped.
- PayAsYouGo max_chunk_amount / max_amount_per_period / period accumulator all bind on GROSS (execute_composable.rs:963, 983, 1392).
- Delegate check: delegated_amount >= gross_pull (execute_composable.rs:995).
- ComposableExecuted event carries gross_pulled + fee fields (execute_composable.rs:1435-1438).
- cargo check green (2026-07-06).
