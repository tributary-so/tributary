---
# tributary-5bfh
title: Distinguish devnet/mainnet USDC mint in showcase-topup-sol
status: completed
type: bug
priority: high
created_at: 2026-06-30T13:25:06Z
updated_at: 2026-06-30T13:33:21Z
---

USDC_MINT in apps/showcase-topup-sol/src/lib/pools.ts is hardcoded to mainnet. When the app runs against devnet (cluster selector), it still uses the mainnet USDC mint, so balance lookups, ATA creation, and policy creation target the wrong mint.

Make the mint cluster-aware:
- [x] Add USDC_MINT_DEVNET (4zMMC9sPQTHBiRWvU86m3MQYxAfFhCuJxKgjESUWnWRC) + getUsdcMint(network) helper in pools.ts
- [x] Update ConnectStep.tsx to resolve mint from useCluster()
- [x] Update useCreateTopupPolicy.ts to resolve mint from useCluster()
- [x] Include cluster in react-query cache key (ConnectStep balance)
- [x] tsc + lint clean

## Summary of Changes

Made the USDC funding mint cluster-aware in apps/showcase-topup-sol/.

- src/lib/pools.ts: replaced single USDC_MINT (mainnet-only) with USDC_MINT_MAINNET + USDC_MINT_DEVNET + getUsdcMint(network) helper. Devnet uses test mint 4zMMC9sPQTHBiRWvU86m3MQYxAfFhCuJxKgjESUWnWRC (Solana Cookbook convention; no canonical Circle USDC on devnet). Defaults to mainnet for unknown/custom clusters.
- src/components/steps/ConnectStep.tsx: resolves mint via useCluster() + getUsdcMint(); added cluster.name to react-query balance cache key.
- src/hooks/useCreateTopupPolicy.ts: resolves mint via useCluster() + getUsdcMint(); all 7 former USDC_MINT sites use resolved mint; usdcMint added to submit deps.

Verification: tsc -b clean for changed files (one pre-existing unrelated error in Lighthouse guard.numAccounts at line 210, confirmed via git stash); eslint clean on all three files.
