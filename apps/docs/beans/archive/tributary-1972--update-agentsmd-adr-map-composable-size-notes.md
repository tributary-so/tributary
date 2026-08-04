---
# tributary-1972
title: Update AGENTS.md ADR map + composable SIZE notes
status: completed
type: task
priority: normal
created_at: 2026-07-12T19:12:54Z
updated_at: 2026-07-13T07:33:42Z
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

## Summary of Changes

Doc sync after the in-place ADR amendments (bean tributary-0dzc).

**AGENTS.md**
- ValidationPda PDA table row: `≤1024 bytes` → `≤512 bytes`.
- ForwardConfig code block: `pinned_accounts: [PinnedAccount; 4]` → `[PinnedAccount; 2]`; added `InstructionConstraint::SIZE = 140 bytes` and `ForwardConfig::SIZE = 205 bytes` notes (sourced from the const comments in `programs/tributary/src/state/composable_policy.rs`); cited ADR-0021 amended + ADR-0022 amended.
- ValidationPda assertion data note: `≤1024 bytes` → `≤512 bytes`.

**apps/docs/adr/0022-fixed-size-pdas-no-realloc.md**
- Updated the decision-table rows for `Forward pinned accounts` (`[Pubkey; 4]` → `[Pubkey; 2]`) and `Assertion data` (`[u8; 1024]` → `[u8; 512]`) with new rationale blurbs pointing at the amending ADRs.
- Updated the "rent waste is trivial" paragraph (`1 of 4 pins` → `1 of 2 forward pins`) and the "when this decision would be revisited" paragraph (`exceeds 1024 bytes` → `exceeds 512 bytes`).
- Added a `## Amendment (2026-07-12): two caps reduced` block pointing at ADR-0021 + ADR-0009 (amended) and the scrapped-blocker verdict (no new ADR-0030; composable is greenfield, MODIFY-IN-PLACE).

**apps/docs/docs/protocol-reference/**
- `changelog.md`: `≤1024 bytes` → `≤512 bytes`.
- `accounts-and-pdas.md`: PDA-table row and per-field layout table (`[u8; 1024]` → `[u8; 512]`, size 1024 → 512).
- `error-codes.md`: rows 6053 and 6056 — `1024` → `512`.
- `overview.md`: mermaid VP node `≤1024 bytes` → `≤512 bytes`.
- `composable-policy/overview.md`: PDA-table row `≤1024 bytes` → `≤512 bytes`.
- `composable-policy/validation-hook.md`: heading, PDA-table max-size cell, the `MAX_VALIDATION_DATA_SIZE` const in the code block, the "remaining bytes" sentence, and the SDK comment.

**apps/docs/docs/integration-guide/programmable-pull-payments/**
- `sdk.md`: `≤1024 bytes` → `≤512 bytes`.
- `lighthouse-facade.md`: warning admonition + body — both `1024` → `512`.

### Notes
- The "add row for 0030" touch point in the bean body was stale — acceptance criteria explicitly says "no new row — those ADRs are amended in place." No ADR-0030 file exists; blocker tributary-0dzc confirmed MODIFY-IN-PLACE.
- The bean body's size math (InstructionConstraint 202→138, ForwardConfig 267→203) is off by 2 bytes each — it excludes the two `num_*_accounts: u8` counter bytes. Used the authoritative source-code values (140 / 205) per the const SIZE comments.
- ADR-0022 was not in the blocker's touch list but contained stale forward-looking claims citing both reduced consts; added an amendment block there too for consistency with 0021/0009/0016.

### Acceptance
- [x] ADR map table entries for 0021/0009/0016 still resolve (no new row — those ADRs are amended in place).
- [x] Composable / ValidationPda capacity notes match the new consts.
- [x] No other stale `1024` / `4` references to these two consts in AGENTS.md or apps/docs/.
