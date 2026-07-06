---
# tributary-e2td
title: 'Documentation: composable fee rebase (ADR-0026 + amendments)'
status: completed
type: feature
priority: high
created_at: 2026-07-05T07:47:01Z
updated_at: 2026-07-06T07:16:00Z
parent: tributary-t6gt
---

Author and update the documentation artifacts for the composable fee rebase.

Acceptance criteria:
- [ ] ADR-0026 created: apps/docs/adr/0026-composable-fee-rebase-input-side.md — captures the full design (fee model, caps/delegate, residual routing, three settlement shapes, create-time rejects, accountability split).
- [ ] ADR-0010 amendment (v2.2): rule 1 (>0 guard) now mode-conditional — deliver mode keeps it, act mode skips it.
- [ ] ADR-0018 scope note: composable fee path now input-side; gateway earn-currency shifts output→input.
- [ ] AGENTS.md updated: ComposablePolicy section reflects input-side fees + act/deliver shapes + fee-account denomination.
- [ ] CONTEXT.md act/deliver settlement shape terms — DONE during design grill (Forward hook, Settlement, Settlement shape, Output mint entries updated).
- [ ] Program details table / PDAs section updated if fee-account constraints changed.

Parent: tributary-t6gt. Out of scope: ADRs for ALLOWED_FORWARD_PROGRAMS expansion (Velocity allowlisting is a separate decision).

## Summary of Changes

Implemented in commit 9bc9e8a (merged to develop). Verified 2026-07-06:
- ADR-0026 created: apps/docs/adr/0026-composable-input-side-fees-act-deliver-shapes.md (97 lines) — full design: fee model, caps/delegate, residual routing, three settlement shapes, create-time rejects, accountability split.
- ADR-0010 amendment (v2.2) appended: adr/0010-composable-settlement-semantics.md:57 — >0 guard now mode-conditional (deliver keeps it, act skips it).
- ADR-0018 scope note appended: adr/0018-unified-fee-model.md:108 — composable fee path moved to input-side; gateway earn-currency shifts output -> input.
- AGENTS.md updated (ComposablePolicy section reflects input-side fees + act/deliver shapes + fee-account denomination).
- CONTEXT.md updated (act/deliver settlement shape terms).
- All acceptance criteria met.
