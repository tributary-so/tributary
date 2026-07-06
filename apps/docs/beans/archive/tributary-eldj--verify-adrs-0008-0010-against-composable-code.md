---
# tributary-eldj
title: Verify ADRs 0008-0010 against composable code
status: completed
type: task
priority: normal
created_at: 2026-06-26T11:02:11Z
updated_at: 2026-06-26T11:07:14Z
---

Verify accuracy of 3 ADRs against code reality. Edit ADRs to match code if drift found. Do NOT modify code.

## Summary of Changes

Verified 3 ADRs (0008, 0009, 0010) against `programs/tributary/src/instructions/composable/*`, `constants.rs`, `state/composable_policy.rs`, `state/validation_pda.rs`, `shared/fees.rs`.

**ADR 0008 (CPI privilege boundary):** 1 edit.
- Fixed claim #2: `is_writable` is preserved ONLY in `build_forward_account_metas`. `build_validation_account_metas` hard-codes BOTH `is_signer=false` AND `is_writable=false` (validation is read-only). Original text implied writability was preserved across both CPIs.
- All other claims confirmed: ComposablePolicy PDA owns intermediates (execute_composable.rs:733,908), forward only signs with PDA (line 189), allowlists exact (constants.rs:13-17), Token Program absent from forward allowlist.

**ADR 0009 (sentinel-disabled, externally stored):** No edits. All claims confirmed:
- SystemProgram disables validation at create (create_composable_policy.rs:172), stored as Pubkey::default() via ValidationConfig::default().
- Pubkey::default() disables forward (create_composable_policy.rs:340).
- ValidationPda seed `composable_validation` (constants.rs:11), MAX_VALIDATION_DATA_SIZE=1024 (validation_pda.rs:3).
- Lazy-created only when has_validation (create_composable_policy.rs:236).
- Discriminator-at-offset-0 required (create_composable_policy.rs:157-164).

**ADR 0010 (settlement semantics):** No edits. All claims confirmed:
- min_output_amount checked against sweep_amount (NET post-fee) at execute_composable.rs:411-418.
- forward_amount rejected for non-PayAsYouGo with InvalidAmount (execute_composable.rs:794).
- forward_amount is the per-call chunk for PayAsYouGo (execute_composable.rs:793).
- FORWARD_FLAG_NATIVE_OUTPUT = 1 (constants.rs:24).
- NATIVE_OUTPUT closeAccount destination pinned to recipient (execute_composable.rs:683-687, 464-474).
- NATIVE_OUTPUT requires output_mint == NATIVE_MINT at create-time (create_composable_policy.rs:367-372).
