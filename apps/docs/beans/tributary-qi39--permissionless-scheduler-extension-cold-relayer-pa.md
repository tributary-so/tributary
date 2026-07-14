---
# tributary-qi39
title: Permissionless scheduler extension (cold-relayer path + scheduler_ATA slice)
status: todo
type: feature
priority: normal
created_at: 2026-07-14T12:15:31Z
updated_at: 2026-07-14T12:15:31Z
---

Currently `ComposableScheduler.fire()` signs with the gateway's own keypair, so on-chain `is_permissionless = false` and the scheduler_ATA trailing slot is never built. To support cold-relayer execution (ADR-0016 amended) the scheduler must:

- Accept an arbitrary relayer keypair (not the gateway signer) as fee_payer.
- Append the relayer's input_mint ATA as the LAST entry in `remaining_accounts` when `is_permissionless && scheduler_share_bps > 0` (see execute_composable.rs:1086-1101). Without it the program fails `MissingSchedulerFeeAccount`.
- Verify the relayer ATA via the program's checks: owned by Token/Token-2022, mint == input_mint, owner == fee_payer.
- Settle fee routing in the SDK facade too — `sdk.executeComposable` may need a new optional relayer-ATA param.

Triggered by the validation-PDA fix (bean tributary-dilx): the existing fire path is now correct for the trusted-signer case but still omits the scheduler_ATA slice, which becomes mandatory the moment the scheduler is pointed at a non-gateway key.
