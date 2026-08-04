---
# tributary-77sa
title: 'CLI: composable-policy execute — auto-derive validation targets + default forward amount'
status: completed
type: feature
priority: high
created_at: 2026-07-10T08:51:21Z
updated_at: 2026-07-10T08:53:37Z
---

The execute command should auto-derive reasonable defaults from the on-chain policy state instead of requiring manual flags for everything.

## Improvements
1. Default --forward-amount to maxChunkAmount for PayAsYouGo
2. Auto-derive pre-validation target accounts from the pre ValidationPda (pinnedAccounts)
3. Auto-derive post-validation target accounts from the post ValidationPda
4. Flags override defaults

## remaining_accounts order (program contract)
[...preValTargets, ...forwardAccounts, ...postValTargets, (scheduler_ata)]

Refs: tributary-r0b2 (parent refactor)

## Summary of Changes

- Default --forward-amount to maxChunkAmount for PayAsYouGo variant
- Auto-derive pre-validation targets from pre ValidationPda (parseValidationPda + pinnedAccounts)
- Auto-derive post-validation targets from post ValidationPda
- Added --post-validation-accounts flag for manual override
- remaining_accounts assembled in correct program order: [pre, forward, post, scheduler?]
- Build + lint pass
