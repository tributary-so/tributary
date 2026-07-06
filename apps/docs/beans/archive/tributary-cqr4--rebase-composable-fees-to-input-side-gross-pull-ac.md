---
# tributary-cqr4
title: Rebase composable fees to input-side (gross pull) + act/deliver settlement shapes
status: completed
type: task
priority: high
created_at: 2026-07-05T08:06:27Z
updated_at: 2026-07-05T08:44:29Z
---

Implement the locked design: fee on gross pull skimmed from intermediate_input before forward; NET-on-pull hardcoded for composable; fee accounts flip to input_mint; three settlement shapes (deliver-no-transform / deliver-transform / act); intermediate_input residual → user; SDK requiredDelegatedAmount helper; ADR-0026 + 0010/0018 amendments.

## Implementation checklist

### Program (Rust/Anchor)
- [x] ForwardConfig: output_mint sentinel semantics (Pubkey::default() = act mode)
- [x] Settlement-shape helpers on ForwardConfig (is_act_mode / is_deliver_transform / is_deliver_no_transform / needs_output_ata)
- [x] validate_forward_config: act-mode rules (forward enabled + sentinel output_mint)
- [x] execute_composable: pull face+fee (gross), skim fee from intermediate_input before forward
- [x] execute_composable: fee accounts (gateway/protocol/scheduler) denominated in input_mint
- [x] execute_composable: act mode skips output ATA creation + deliver sweep
- [x] execute_composable: intermediate_input residual → user (when forward ran)
- [x] execute_composable: >0 guard only in deliver-transform mode
- [x] execute_composable: delegate/cap checks bind on gross (face+fee); PayAsYouGo caps on gross
- [x] Account struct: output_mint conditional (SystemProgram ok in act mode); fee accounts → input_mint
- [x] New error variants (InvalidOutputMintAccount, ActModeRequiresForward, InputResidueSweepFailed)
- [x] Rust unit tests for settlement shapes + create-time act-mode validation (166 tests green)

### SDK (TypeScript)
- [x] getCreateComposablePolicyInstruction: output_mint optional (None = act sentinel)
- [x] executeComposable: fee accounts in input_mint; act-mode account handling; deliver-no-transform ATA
- [x] requiredDelegatedAmount(face, gateway) helper
- [x] SDK builds clean (tsc --noEmit)

### Docs
- [x] ADR-0026 (new): input-side fees + act/deliver shapes
- [x] ADR-0010 amendment (v2.2): >0 guard mode-conditional
- [x] ADR-0018 scope note: composable fee path now input-side
- [x] CONTEXT.md: act/deliver settlement-shape terms + net-mode-hardcoded note
- [x] AGENTS.md: v2.2 execution flow + fee model + output_mint semantics + ADR map

### Verification
- [x] cargo build + cargo test — 166 Rust tests green
- [x] anchor build --arch sbf — handler frame clean (driftsort_main pre-existing)
- [x] SDK: tsc --noEmit + tsup build clean
- [ ] TS integration tests (require Surfpool — deferred to follow-up bean)



## Summary of Changes

### Program contract (programs/tributary/)
- **execute_composable.rs**: rebased fee path from output-side to input-side.
  Phase 1 pulls GROSS (face + fee, NET-on-pull hardcoded); new Phase 1b
  `skim_input_fees` routes protocol/gateway/scheduler cuts to input_mint
  accounts BEFORE forward. Phase 5 settlement is shape-dependent:
  deliver-no-transform (sweep face → recipient), deliver-transform (sweep
  output → recipient, >0 guard KEPT, input residue → user), act (input
  residue → user, NO deliver sweep, NO >0 guard). Delegate + PayAsYouGo
  caps bind on gross. SBF stack-pressure fix: scalar extraction of
  ForwardConfig fields + lazy AccountInfo creation.
- **create_composable_policy.rs**: output_mint is now UncheckedAccount
  (SystemProgram in act mode). validate_forward_config accepts act-mode
  sentinel (Pubkey::default + forward enabled); rejects NATIVE_OUTPUT in
  act mode.
- **state/composable_policy.rs**: new ForwardConfig helpers —
  is_act_mode, is_deliver_transform, is_deliver_no_transform,
  needs_output_ata, forward_enabled.
- **error.rs**: InvalidOutputMintAccount, ActModeRequiresForward,
  InputResidueSweepFailed.
- Account struct: gateway_fee_account + protocol_fee_account constraints
  flip from output_mint to input_mint.

### SDK (packages/sdk/)
- getCreateComposablePolicyInstruction: outputMint optional (sentinel = act mode).
- executeComposable: fee accounts in input_mint; shape-aware recipient +
  intermediate ATA resolution.
- requiredDelegatedAmount(face, gateway): computes gross pull for delegate
  approval sizing.

### Docs
- ADR-0026 (new): full design rationale + rejected alternatives.
- ADR-0010 amendment (v2.2): >0 guard now mode-conditional.
- ADR-0018 scope note: composable fee path input-side, NET hardcoded.
- CONTEXT.md: act/deliver settlement-shape terms + net-mode-hardcoded.
- AGENTS.md: v2.2 execution flow, fee model, output_mint semantics, ADR map.

### Test results
- 166 Rust unit tests green (including 7 new settlement-shape + act-mode tests).
- SDK: tsc --noEmit + tsup build clean.
- SBF build: handler frame clean (driftsort_main warning is pre-existing).
- Integration tests (Surfpool): deferred to follow-up bean.
