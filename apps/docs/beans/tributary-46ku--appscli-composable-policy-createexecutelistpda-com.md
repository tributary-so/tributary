---
# tributary-46ku
title: 'apps/cli: composable-policy create/execute/list/pda commands'
status: todo
type: feature
priority: high
created_at: 2026-07-10T10:19:42Z
updated_at: 2026-07-10T10:19:48Z
parent: tributary-u3gi
blocked_by:
    - tributary-fln0
---

## Files
- `apps/cli/src/commands/composable-policy/create.ts`
- `apps/cli/src/commands/composable-policy/execute.ts`
- `apps/cli/src/commands/composable-policy/list.ts`
- `apps/cli/src/commands/pda/validation-pda.ts`

## Changes
- [ ] `create.ts`: Update instructionConstraint.pinnedAccounts construction to use indexed pin format `[{index, pubkey}, ...]` instead of flat `PublicKey[]`
- [ ] `execute.ts`: The pinnedAccounts referenced here are for ValidationPda (pre/post) — verify these are NOT changed (ValidationPda stays positional). Only forward CPI pins change.
- [ ] `list.ts`: Reads `instructionConstraint.programId` only — verify no pinned_accounts display logic to update, or update if present.
- [ ] `pda/validation-pda.ts`: Reads ValidationPda.pinnedAccounts — UNCHANGED (positional). Verify no breakage.
- [ ] Build passes: `cd apps/cli && pnpm run build`
- [ ] Lint passes
