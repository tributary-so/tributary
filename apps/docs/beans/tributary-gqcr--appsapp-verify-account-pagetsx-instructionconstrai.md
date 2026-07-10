---
# tributary-gqcr
title: 'apps/app: verify account-page.tsx instructionConstraint reads'
status: todo
type: feature
priority: low
created_at: 2026-07-10T10:20:43Z
updated_at: 2026-07-10T10:20:52Z
parent: tributary-u3gi
blocked_by:
    - tributary-fln0
---

## Files
- `apps/app/src/components/account/account-page.tsx`

## Changes
- [ ] Lines 602, 1388-1389: reads `forwardConfig.instructionConstraint.programId` — these resolve via SDK types from IDL. After the IDL regenerates with PinnedAccount, verify no type errors.
- [ ] If the page displays pinned_accounts anywhere, update the rendering for indexed format.
- [ ] Build passes
- [ ] Lint passes
