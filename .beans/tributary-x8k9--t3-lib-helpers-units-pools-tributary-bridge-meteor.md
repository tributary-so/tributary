---
# tributary-x8k9
title: 'T3: lib helpers (units, pools, tributary bridge, meteora)'
status: completed
type: task
priority: normal
created_at: 2026-06-25T10:48:53Z
updated_at: 2026-06-25T11:05:10Z
parent: tributary-vyg1
blocked_by:
    - tributary-vur0
---

Pure-logic module, no UI: src/lib/units.ts (solToLamports/lamportsToSol, usdcToRaw/rawToUsdc, formatShort), src/lib/pools.ts (PRESET_POOLS: [{label:'SOL/USDC', address:BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y, baseMint:WSOL, quoteMint:USDC}] + Meteora DLMM program id constant), src/lib/tributary.ts (walletAdapterToIWallet() bridge, useTributarySdk() hook returning Tributary instance bound to useConnection()+useWallet(), re-exports getConfigPda/getGatewayPda/getUserPaymentPda/getComposablePolicyPda/getValidationPda), src/lib/meteora.ts (buildSwapDiscriminator(poolAddress, inMint, outMint, inAmount, minOut) -> loads DLMM.create, calls pool.swap, returns {discriminator:number[], minOutAmount} WITHOUT sending; inlines the hostFeeIn rewrite from tests/topup-balance-sol.test.ts). Verify: types check; meteora.ts exports typed signatures.

## Summary of Changes

Pure-logic lib layer (no UI):
- lib/units.ts: solToLamports/lamportsToSol, usdcToRaw/rawToUsdc, formatShort (SOL=1e9, USDC=1e6)
- lib/pools.ts: METEORA_DLMM_PUBKEY, USDC_MINT, WSOL_MINT=NATIVE_MINT, PresetPool + PRESET_POOLS (SOL/USDC BGm1tav...)
- lib/tributary.ts: useTributarySdk() hook (binds useConnection+useWallet -> Tributary SDK via IWallet bridge from wallet-adapter state), re-exports PDA helpers
- lib/meteora.ts: buildSwapQuote() loads DLMM.create, quotes swap, returns {discriminator (8 bytes), minOutAmount}; rewriteHostFeeIn() helper for execute-time. Mirrors buildSwapIx from tests/topup-balance-sol.test.ts.

Verified: tsc -b clean. (meteora.ts tree-shaken from build until imported by UI in T4/T5.)
