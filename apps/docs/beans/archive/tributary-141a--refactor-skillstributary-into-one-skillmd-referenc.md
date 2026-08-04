---
# tributary-141a
title: Refactor skills/tributary into one SKILL.md + references/, add composable-recipes reference
status: completed
type: task
priority: normal
created_at: 2026-07-27T09:50:13Z
updated_at: 2026-07-27T09:54:49Z
---

## Summary of Changes

### Refactor: one SKILL.md + references/
- `git mv` SKILL-cli/sdk/composables.md → references/{cli,sdk,composables}.md (history preserved, 3 staged renames).
- Rewrote skills/tributary/SKILL.md as the single entry point:
  - Added YAML frontmatter (name/description) to align with the sibling skills/solana-payments convention + the vendored Trail-of-Bits skill spec.
  - Replaced the Sub-Guides table with a progressive-disclosure References table (relative links, 'when to load' column) covering all 4 references incl. the new one.
  - Added @tributary-so/forward-builders to the Packages table.

### New reference: references/composable-recipes.md
- Documents the @tributary-so/forward-builders recipe layer (ADR-0030/0033) end to end.
- Three-tier mental model, ForwardBuilder contract (ADR-0008 signer sanitization), all four on-chain-allowlisted forward programs (Meteora DLMM, Raydium CPMM, Raydium CLMM, Orca Whirlpool — notes that AGENTS.md/ADR-0032 lag and only list the first two).
- Named recipes (createSwapWhenBalanceLow per DEX) + manual-composition template for Whirlpool (no named recipe).
- Two full end-to-end examples lifted from tests/topup-balance-swap-{meteora,whirlpool}.test.ts, plus the same-mint no-forward case from topup-balance.test.ts.
- face resolution, enforcement posture table, dispatch helper, peer-dependency install notes.
- All code signatures verified against source; ADR links resolve.
