---
# tributary-1972
title: Update AGENTS.md ADR map + composable SIZE notes
status: todo
type: task
priority: normal
created_at: 2026-07-12T19:12:54Z
updated_at: 2026-07-12T19:19:12Z
parent: tributary-nz1u
blocked_by:
    - tributary-0dzc
---

Parent tributary-nz1u. Doc sync after the ADR amendments (task tributary-0dzc) land.

## Touch points
- `AGENTS.md` ADR map table — add row for 0030 with link `apps/docs/adr/0030-…md`.
- `AGENTS.md` ComposablePolicy ForwardConfig section — the InstructionConstraint field table currently implies 4 pinned_accounts; update the size note (202→138 bytes for InstructionConstraint; ForwardConfig 267→203).
- `AGENTS.md` ValidationPda note ("≤1024 bytes") — update to ≤512.

## Acceptance criteria
- [ ] ADR map table entries for 0021/0009/0016 still resolve (no new row — those ADRs are amended in place).
- [ ] Composable / ValidationPda capacity notes match the new consts.
- [ ] No other stale `1024` / `4` references to these two consts in AGENTS.md or apps/docs/.
