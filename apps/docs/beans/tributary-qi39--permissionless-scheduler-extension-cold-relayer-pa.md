---
# tributary-qi39
title: Permissionless scheduler extension (cold-relayer path + scheduler_ATA slice)
status: completed
type: feature
priority: normal
created_at: 2026-07-14T12:15:31Z
updated_at: 2026-07-15T20:32:53Z
---

Currently `ComposableScheduler.fire()` signs with the gateway's own keypair, so on-chain `is_permissionless = false` and the scheduler_ATA trailing slot is never built. To support cold-relayer execution (ADR-0016 amended) the scheduler must:

- Accept an arbitrary relayer keypair (not the gateway signer) as fee_payer.
- Append the relayer's input_mint ATA as the LAST entry in `remaining_accounts` when `is_permissionless && scheduler_share_bps > 0` (see execute_composable.rs:1086-1101). Without it the program fails `MissingSchedulerFeeAccount`.
- Verify the relayer ATA via the program's checks: owned by Token/Token-2022, mint == input_mint, owner == fee_payer.
- Settle fee routing in the SDK facade too — `sdk.executeComposable` may need a new optional relayer-ATA param.

Triggered by the validation-PDA fix (bean tributary-dilx): the existing fire path is now correct for the trusted-signer case but still omits the scheduler_ATA slice, which becomes mandatory the moment the scheduler is pointed at a non-gateway key.

## Summary of Changes

Implemented the cold-relayer path for the composable scheduler + scheduler_ATA fee routing in the SDK facade.

### SDK (`packages/sdk`)

**`composable.ts`** — new exported pure helper `deriveSchedulerAta({ authority, gatewaySigner, schedulerShareBps, inputMint })`:
- Returns `null` when authority == gateway.signer (trusted-signer path) or schedulerShareBps <= 0.
- Returns `getAssociatedTokenAddressSync(inputMint, authority)` when permissionless + scheduler share > 0.
- Pure PDA derivation, no RPC.

**`sdk.ts`** — `executeComposable()` now:
- Calls `deriveSchedulerAta` after fetching the gateway account.
- Ensures the relayer ATA exists (input-side `ensureAta`).
- Appends the scheduler ATA as the LAST `remaining_account` (`isWritable: true, isSigner: false`) when permissionless. This is the slot the program strips at execute_composable.rs:1091-1101 to route the scheduler cut.

### Scheduler (`apps/scheduler`)

**`composable.ts`** — `ComposableScheduler`:
- Accepts optional `relayerKeypairPath` / `relayerPrivateKeys` config.
- Loads relayer keypairs separately from gateway keypairs.
- `fire()` renamed param `gateway → signer`; signs with the relayer when configured, falls back to the gateway keypair (backward-compat trusted-signer path).
- Does NOT manually append the scheduler ATA — the SDK facade handles it.

**`index.ts`** — reads `RELAYER_WALLET` / `RELAYER_PRIVATE_KEY` env vars.

**`payments.ts`** — `SchedulerConfig` interface extended with relayer fields (ignored by `PaymentScheduler`).

### Tests

**`tests/composable-primitives.test.ts`** — 4 new unit tests for `deriveSchedulerAta` covering trusted-signer (null), zero share (null), permissionless (ATA derived), and 1-bps edge case.

### Commits

- `feat(sdk): add deriveSchedulerAta + scheduler ATA routing in executeComposable`
- `feat(scheduler): cold-relayer keypair support for composable execution`
