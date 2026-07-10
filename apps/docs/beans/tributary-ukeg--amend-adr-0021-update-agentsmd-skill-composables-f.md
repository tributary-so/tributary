---
# tributary-ukeg
title: Amend ADR-0021 + update AGENTS.md + SKILL-composables for indexed pins
status: todo
type: feature
priority: normal
created_at: 2026-07-10T10:21:58Z
updated_at: 2026-07-10T10:21:58Z
parent: tributary-btqv
---

## Files
- `apps/docs/adr/0021-composable-v21-instructionconstraint-validation-spec.md`
- `AGENTS.md`
- `skills/tributary/SKILL-composables.md`

## Changes
- [ ] ADR-0021: Amend the `pinned_accounts` section. Replace positional rationale with indexed rationale:
  - Forward programs dictate fixed account grammars; Tributary cannot reshape
  - Positional pins only constrain contiguous prefix → accounts at non-contiguous positions unpinnable → account-substitution drain vector
  - Indexed pins: `{index: u8, pubkey: Pubkey}` allows pinning any position in the forward-account slice
  - All active pins must be concrete (no default-pubkey wildcards — decision B)
  - has_effective_pins() simplifies to num_pinned > 0
  - Note: ValidationPda.pinned_accounts stays positional (owner controls assertion ordering)
- [ ] AGENTS.md: Update the InstructionConstraint code block (lines ~259-265) to show `pinned_accounts: [PinnedAccount; 4]` with the PinnedAccount struct
- [ ] AGENTS.md: Update the degenerate-pin guard description if needed
- [ ] SKILL-composables.md: Update InstructionConstraint interface block (line ~321) and the pinned_accounts mapping description (lines ~892-901)
- [ ] `make build` passes (docs build)
