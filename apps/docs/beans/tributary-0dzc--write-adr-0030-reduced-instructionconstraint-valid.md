---
# tributary-0dzc
title: Modify ADR-0021 + ADR-0009 + ADR-0016 in place for the two reductions
status: todo
type: task
priority: normal
created_at: 2026-07-12T19:12:54Z
updated_at: 2026-07-12T19:18:24Z
parent: tributary-nz1u
---

Parent tributary-nz1u. MODIFY-IN-PLACE — composable is NOT deployed anywhere (develop branch = greenfield), so no new ADR is warranted. Update the three existing ADRs that cite the affected constants.

## ADR content (REWRITTEN — see appended full rewrite below)
- Decision: reduce MAX_PINNED_FORWARD_ACCOUNTS 4→2 (tx-size), reduce MAX_VALIDATION_DATA_SIZE 1024→512 (rent).
- The tx-too-big diagnosis (1264B > 1232 cap; the 64B forward-pin saving).
- The non-obvious fact that MAX_VALIDATION_DATA_SIZE does NOT affect tx size (Vec<u8> variable-length; data read from account at execute).
- BREAKING nature of the forward-pin reduction (mid-struct field, shifts trailing offsets) — mainnet-live.
- The migration posture picked in blocker tributary-d1qw (wipe / new program ID / versioned migration) + rationale.
- Non-breaking nature of validation-data reduction (trailing field).
- Rejected alternatives: LUT-only (insufficient alone), split validation-init (deferred, separate bean), keep 4 pins (tx still over cap).

## Acceptance criteria
- [ ] File at `apps/docs/adr/0030-reduced-composable-capacity.md` using 0001 format as template.
- [ ] Cross-ref the tx-size diagnosis bean (tributary-u8n4).
- [ ] Record the D1 posture verdict.
- [ ] Add to the AGENTS.md ADR map table (next task).

Parent tributary-nz1u. MODIFY-IN-PLACE — composable is NOT deployed anywhere (develop branch = greenfield), so no new ADR is warranted. Update the three existing ADRs that cite the affected constants.

## Touch points

### ADR-0021 (Composable v2.1: InstructionConstraint + Unified ValidationSpec)
Primary owner of the forward-pin layout.
- Line 26: `inline pinned_accounts: [Pubkey; 4]` → `[Pubkey; 2]`; update the rationale sentence (the 4 was sized for a DLMM route — confirm 2 still covers the canonical swap per blocker tributary-ahfg).
- Line 66: the indexed-pin migration note referencing the old positional `[Pubkey; 4]` → update to 2.
- Add a one-line amendment: "Reduced 4→2 (2026-07-12) to cut create_composable_policy tx size; composable not yet live so the layout change is non-breaking."

### ADR-0009 (Composable hooks: sentinel-disabled, externally stored)
- Line 20: `≤1024 bytes` → `≤512 bytes` for the ValidationPda assertion capacity. Add the rationale (rent reduction; Lighthouse assertions in practice are <200B, 512 leaves ample headroom).

### ADR-0016 (Permissionless composable execution)
- Line 234: `pub data: [u8; MAX_VALIDATION_DATA_SIZE], // 1024` → `// 512`.
- Line 293: `pinned_accounts: [Pubkey; 4]` (InstructionConstraint ref) → `[Pubkey; 2]`.
- Line 232 is MAX_PINNED_ACCOUNTS (validation-side, already 2) — leave alone.

## Acceptance criteria
- [ ] ADR-0021: [Pubkey; 4] → [Pubkey; 2] both occurrences; amendment line added.
- [ ] ADR-0009: 1024 → 512; rationale line added.
- [ ] ADR-0016: line 234 comment 1024 → 512; line 293 [Pubkey; 4] → [Pubkey; 2].
- [ ] No NEW ADR file created.
- [ ] Cross-link to milestone tributary-u8n4 for the diagnosis context.
