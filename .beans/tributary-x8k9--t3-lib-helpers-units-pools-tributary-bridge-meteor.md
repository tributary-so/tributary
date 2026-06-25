---
# tributary-x8k9
title: 'T3: lib helpers (units, pools, tributary bridge, meteora)'
status: todo
type: task
priority: normal
created_at: 2026-06-25T10:48:53Z
updated_at: 2026-06-25T10:49:15Z
parent: tributary-vyg1
blocked_by:
    - tributary-vur0
---

Pure-logic module, no UI: src/lib/units.ts (solToLamports/lamportsToSol, usdcToRaw/rawToUsdc, formatShort), src/lib/pools.ts (PRESET_POOLS: [{label:'SOL/USDC', address:BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y, baseMint:WSOL, quoteMint:USDC}] + Meteora DLMM program id constant), src/lib/tributary.ts (walletAdapterToIWallet() bridge, useTributarySdk() hook returning Tributary instance bound to useConnection()+useWallet(), re-exports getConfigPda/getGatewayPda/getUserPaymentPda/getComposablePolicyPda/getValidationPda), src/lib/meteora.ts (buildSwapDiscriminator(poolAddress, inMint, outMint, inAmount, minOut) -> loads DLMM.create, calls pool.swap, returns {discriminator:number[], minOutAmount} WITHOUT sending; inlines the hostFeeIn rewrite from tests/topup-balance-sol.test.ts). Verify: types check; meteora.ts exports typed signatures.
