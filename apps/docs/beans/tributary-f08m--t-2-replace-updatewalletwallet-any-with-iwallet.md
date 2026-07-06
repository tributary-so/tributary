---
# tributary-f08m
title: 'T-2: Replace updateWallet(wallet: any) with IWallet'
status: completed
type: task
priority: normal
created_at: 2026-07-06T15:42:02Z
updated_at: 2026-07-06T16:46:16Z
parent: tributary-jnx8
---

sdk/src/sdk.ts:124 — IWallet type exists, use it instead of any.

## Summary of Changes
Replaced updateWallet(wallet: any) with updateWallet(wallet: Keypair | IWallet) in packages/sdk/src/sdk.ts:124, mirroring the constructor's signature. Also mirrored the constructor's Keypair→IWallet adapter inside updateWallet so a raw Keypair no longer leaks through to anchor.AnchorProvider (which expects a Wallet interface).
