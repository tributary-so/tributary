---
# tributary-py23
title: Integration tests use @tributary-so/forward-builders (Meteora refactor + Raydium add)
status: completed
type: task
priority: normal
created_at: 2026-07-22T17:04:20Z
updated_at: 2026-07-22T17:28:52Z
---

Refactor tests/topup-balance-swap.test.ts to use the forward-builder pattern from apps/scheduler/src/composable.ts (meteoraDlmmForwardConfig + createMeteoraDlmmForward + assembleComposableRemainingAccounts). Extract shared surfpool/wallet/gateway/user-payment setup to tests/helpers/topup-swap-env.ts. Add tests/topup-balance-swap-raydium.test.ts mirroring the Meteora test but using raydiumCpmmForwardConfig + createRaydiumCpmmForward. Update tests/package.json + tests/constants.ts.

## Why
ADR-0030 shipped the ForwardBuilder interface + concrete Meteora/Raydium impls in packages/forward-builders so callers stop hand-rolling forward plumbing (the #1 source of setup/fire-time drift). The scheduler already migrated. The integration tests still hand-roll everything — they are the last drift surface and the gate for Raydium CPMM forward validation.

## Tasks
- [x] Add @tributary-so/forward-builders + @raydium-io/raydium-sdk-v2 to tests/package.json
- [x] Add RAYDIUM_CPMM_PUBKEY + a known SOL/USDC CPMM pool to tests/constants.ts
- [x] Extract shared setup (surfpool warmup, wallet funding, gateway/user-payment/ATA creation, config mock, delegate approval) to tests/helpers/topup-swap-env.ts
- [x] Refactor tests/topup-balance-swap.test.ts to use meteoraDlmmForwardConfig + createMeteoraDlmmForward + assembleComposableRemainingAccounts (mirror apps/scheduler/src/composable.ts:437-487)
- [x] Add tests/topup-balance-swap-raydium.test.ts using the shared helper + raydiumCpmmForwardConfig + createRaydiumCpmmForward
- [x] Verify both test files typecheck (pnpm tsc --noEmit on jest.tsconfig.json scope)

## Summary of Changes

- **tests/package.json**: added `@tributary-so/forward-builders: workspace:*` + `@raydium-io/raydium-sdk-v2: ^0.2.59-alpha` to dependencies.
- **tests/constants.ts**: added `RAYDIUM_CPMM_PUBKEY` + `findCpmmPoolForMints(connection, mintA, mintB)` helper (runtime discovery via `getProgramAccounts` on the CPMM program with RPC-side memcmp on `mintA` at offset 168 + dataSize 637 — avoids hardcoding a pool that churns).
- **tests/helpers/topup-swap-env.ts** (NEW): `setupTopupSwapEnv()` — extracts the ~250 lines of DEX-agnostic surfpool/wallet/gateway/user-payment/ATA/config setup shared by both swap suites. Returns a typed `TopupSwapEnv` with `{program, sdk, connection, surfpool, wallets, pdas, atas}`. Surfpool guard, getMultipleAccountsInfo workaround, gateway creation (0 bps), and coldWallet userPayment creation all happen here.
- **tests/topup-balance-swap.test.ts** (Meteora) REFACTORED: 788 → 459 lines. Now uses `meteoraDlmmForwardConfig({inputMint, outputMint, pool})` for the create step and `createMeteoraDlmmForward({pool, slippageBps, applyHostFeeInFix}).build({connection, policy, composablePolicyPda, face})` + `assembleComposableRemainingAccounts({preTargets, forwardAccounts, postTargets})` for the execute step. Mirrors `apps/scheduler/src/composable.ts:437-487`. Removes the hand-rolled `buildSwapIx()` helper, the manual discriminator extraction, and the manual forwardConfig construction.
- **tests/topup-balance-swap-raydium.test.ts** (NEW): Raydium CPMM sibling of the Meteora test. Uses `raydiumCpmmForwardConfig({inputMint, outputMint, pool, ammConfig})` + `createRaydiumCpmmForward({pool, ammConfig, slippageBps}).build()`. Discovers the pool at runtime via `findCpmmPoolForMints` in beforeAll. Same 3-test structure: create policy, execute (succeeds), execute again (fails — period cap).

## Design decisions

### Shared helper extraction
The two swap suites share ~250 lines of surfpool/keypair/ATA/gateway/userPayment setup that is identical and DEX-agnostic. Extracting to `setupTopupSwapEnv()` keeps each test file focused on the forward-builder wiring (the actual subject of the test) and is the difference between a 700-line duplicated suite and a ~250-line DEX-specific one.

### Pool discovery vs hardcoding
Raydium CPMM pools churn (new pools created, old ones drained). Hardcoding a pool address guarantees staleness. `findCpmmPoolForMints` resolves a live pool at runtime via `getProgramAccounts` on the CPMM program with RPC-side filters (dataSize + memcmp on mintA). Order-insensitive (handles both mint orderings). Throws clearly if no pool exists on the fork.

### Scheduler pattern mirrored
Both test files now follow the exact fire-time pattern from `apps/scheduler/src/composable.ts:437-487`:
```
face → ForwardBuilder.build({connection, policy, composablePolicyPda, face})
    → resolveValidationTargets (pre + post in parallel)
    → assembleComposableRemainingAccounts({preTargets, forwardAccounts, postTargets})
    → executeComposable(instructionData, face, remainingAccounts)
```
This kills the last setup/fire-time drift surface (ADR-0030 motivation).

### What is NOT done
- Tests not run end-to-end (require surfpool mainnet fork). The pre-existing `@metaplex-foundation/umi-bundle-defaults` missing-module issue blocks jest from even loading — same failure mode on the unmodified `topup-balance-swap.test.ts` and all other SDK-importing tests. Run via `make test_surfpool` once the env is up.
- The old test's `isWritable: true` hack for all forward accounts (DLMM stale-IDL workaround) is GONE. The forward-builder preserves per-account writability from the swap ix keys (matches scheduler prod behavior). If surfpool needs the hack, re-add it in-test only (post-process `forwardPayload.forwardAccounts`).
