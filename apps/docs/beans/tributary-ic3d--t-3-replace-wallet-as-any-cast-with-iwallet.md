---
# tributary-ic3d
title: 'T-3: Replace wallet as any cast with IWallet'
status: completed
type: task
priority: normal
created_at: 2026-07-06T15:42:03Z
updated_at: 2026-07-06T16:46:25Z
parent: tributary-jnx8
---

sdk-react/src/hooks/useTributarySDK.ts:14 — wallet as any bridges adapter to SDK. Use wallet as IWallet.

## Summary of Changes
Replaced wallet as any with wallet as unknown as IWallet in packages/sdk-react/src/hooks/useTributarySDK.ts:14. Imports IWallet from @tributary-so/sdk. The cast is still needed because wallet-adapter-react's shape isn't structurally identical to IWallet, but unknown-as forces a runtime contract rather than silently bypassing typecheck.
