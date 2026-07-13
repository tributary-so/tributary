---
# tributary-ykyd
title: 'SDK: optional expiryDate on PayAsYouGo builder'
status: completed
type: feature
priority: high
created_at: 2026-07-02T13:05:13Z
updated_at: 2026-07-04T10:30:19Z
parent: tributary-5lv3
blocked_by:
    - tributary-clo7
---

Expose the new optional expiry on the PayAsYouGo builder(s) in `packages/sdk`. Parent: implementation epic (tributary-5lv3). Blocked-by: program-contract feature (the on-chain field must exist first).

## Acceptance criteria

- [ ] `getCreatePayAsYouGoPolicyInstruction` gains optional `expiryDate?: number` (unix seconds; undefined = never expires).
- [ ] Type updates: PayAsYouGo policy shape carries optional `expiryDate`.
- [ ] Convenience helpers (`createPayAsYouGo`-style) thread the param through.
- [ ] `cd packages/sdk && pnpm run build` clean.

## Summary of Changes

- `getCreatePayAsYouGoPolicyInstruction`: added optional `expiryDate?: BN | null` param; `expiryDate ?? null` written on-chain; padding 88→79.
- `createPayAsYouGo`: added optional `expiryDate` (after `referralCode`); threaded into policyType construction.
- IDL regenerated via `anchor build` — `payAsYouGo.expiryDate` now in `target/idl/tributary.json`; SDK types auto-derived.
- apps/cli: `policy create --variant pay-as-you-go --expiry <unix>` and `composable create --variant pay-as-you-go --expiry <unix>`; both pass `expiryDate` through.
- `@tributary-so/sdk` build + `@tributary-so/cli` tsc -b both green.
