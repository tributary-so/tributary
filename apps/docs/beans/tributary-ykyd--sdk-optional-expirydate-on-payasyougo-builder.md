---
# tributary-ykyd
title: 'SDK: optional expiryDate on PayAsYouGo builder'
status: todo
type: feature
priority: high
created_at: 2026-07-02T13:05:13Z
updated_at: 2026-07-02T13:07:39Z
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
