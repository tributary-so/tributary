---
# tributary-e2td
title: 'Documentation: composable fee rebase (ADR-0026 + amendments)'
status: todo
type: feature
priority: high
created_at: 2026-07-05T07:47:01Z
updated_at: 2026-07-05T07:47:01Z
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
