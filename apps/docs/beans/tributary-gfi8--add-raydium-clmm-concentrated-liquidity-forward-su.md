---
# tributary-gfi8
title: Add Raydium CLMM (concentrated liquidity) forward support
status: completed
type: milestone
priority: high
created_at: 2026-07-22T18:34:09Z
updated_at: 2026-08-04T19:48:29Z
---

Pool 3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv (USDC/WSOL) is a CLMM pool owned by CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK (not CPMM). Need CLMM as a third ALLOWED_FORWARD_PROGRAM, a CLMM ForwardBuilder, and the USDC-WSOL test switched to use it. CPMM support stays.

## Tasks
- [x] Add RAYDIUM_CLMM_PUBKEY to ALLOWED_FORWARD_PROGRAMS in constants.rs
- [x] anchor build (rebuild program with new allowlist)
- [x] Implement createRaydiumClmmForward + raydiumClmmForwardConfig in packages/forward-builders/src/raydium-clmm.ts
- [x] Export CLMM symbols from forward-builders/src/index.ts + constants.ts
- [x] Update tests/constants.ts: add CLMM program + pool + loadClmmPoolAmmConfig loader
- [x] Switch tests/topup-balance-swap-raydium.test.ts to use CLMM forward-builder
- [x] Verify typecheck

## Summary of Changes (2026-08-04)

All 7 tasks verified shipped in code. Milestone flipped to completed.

- **Allowlist**: RAYDIUM_CLMM_PUBKEY (CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK) in ALLOWED_FORWARD_PROGRAMS (programs/tributary/src/constants.rs:17).
- **Build**: target/deploy/tributary.so (Aug 1) newer than source (Jul 29); IDL references CLMM. Build is current.
- **ForwardBuilder**: createRaydiumClmmForward + raydiumClmmForwardConfig in packages/forward-builders/src/raydium-clmm.ts:60. Bonus: named recipe createRaydiumClmmSwapWhenBalanceLow (:267) from milestone tributary-69jm.
- **Exports**: index.ts:34-40 (RAYDIUM_CLMM_PUBKEY, createRaydiumClmmForward, raydiumClmmForwardConfig, RAYDIUM_CLMM_SWAP_V2_DISCRIMINATOR).
- **Test fixtures**: tests/constants.ts adds RAYDIUM_CLMM_USDC_WSOL_POOL + loadClmmPoolAmmConfig (reads amm_config PDA at pool offset 9). Shipped name is loadClmmPoolAmmConfig, not loadClmmPoolConfig as the bean anticipated — more accurate (loads the amm_config PDA), just a different name.
- **Test migration**: tests/topup-balance-swap-raydium.test.ts uses createRaydiumClmmSwapWhenBalanceLow recipe + buildComposableExecutionPayload.
- **Typecheck**: pnpm --filter @tributary-so/forward-builders exec tsc --noEmit + eslint both clean.
