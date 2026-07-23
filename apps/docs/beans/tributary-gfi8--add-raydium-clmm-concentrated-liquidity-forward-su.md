---
# tributary-gfi8
title: Add Raydium CLMM (concentrated liquidity) forward support
status: in-progress
type: milestone
priority: high
created_at: 2026-07-22T18:34:09Z
updated_at: 2026-07-22T18:34:09Z
---

Pool 3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv (USDC/WSOL) is a CLMM pool owned by CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK (not CPMM). Need CLMM as a third ALLOWED_FORWARD_PROGRAM, a CLMM ForwardBuilder, and the USDC-WSOL test switched to use it. CPMM support stays.

## Tasks
- [ ] Add RAYDIUM_CLMM_PUBKEY to ALLOWED_FORWARD_PROGRAMS in constants.rs
- [ ] anchor build (rebuild program with new allowlist)
- [ ] Implement createRaydiumClmmForward + raydiumClmmForwardConfig in packages/forward-builders/src/raydium-clmm.ts
- [ ] Export CLMM symbols from forward-builders/src/index.ts + constants.ts
- [ ] Update tests/constants.ts: add CLMM program + pool, switch loadCpmmPoolAmmConfig to loadClmmPoolConfig
- [ ] Switch tests/topup-balance-swap-raydium.test.ts to use CLMM forward-builder
- [ ] Verify typecheck
