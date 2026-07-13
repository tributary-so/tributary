---
# tributary-tspw
title: 'Documentation: ADR-0021 + AGENTS.md for PayAsYouGo expiry'
status: completed
type: feature
priority: normal
created_at: 2026-07-02T13:05:13Z
updated_at: 2026-07-04T10:43:48Z
parent: tributary-f99q
---

Lock in the decision and update docs. Parent milestone: tributary-f99q. May proceed in parallel (decision is already settled).

## Acceptance criteria

- [ ] **ADR-0021**: "Optional PayAsYouGo expiration (per-variant field)". Decision + rejected alternatives (top-level hoist; Subscription/Milestone expiry) + rationale. Use `apps/docs/adr/0020-…md` as the template.
- [ ] Update `AGENTS.md` PolicyType table — PayAsYouGo row notes optional `expiry_date` (`None` = never); add ADR-0021 to the v2 ADR map + link list.
- [ ] apps/docs MkDocs pages touched if any describe PayAsYouGo scheduling.

## Summary of Changes

Note: bean text said "ADR-0021" but that number is taken (composable v2.1). Used the next free number, **ADR-0024**.

- Created `apps/docs/adr/0024-payasyougo-optional-expiration.md` — decision + 4 rejected alternatives (3-variant scope, top-level field, Expired PolicyStatus, create-time sentinel guard). Template: 0020.
- Updated `AGENTS.md`: PayAsYouGo PolicyType row notes optional `expiry_date` (None=never, Some(ts>0) gate, boundary <=, orthogonal to period cap); added ADR-0024 to the v2 ADR map + link list.
- Updated `apps/docs/docs/protocol-reference/payment-policy/payasyougo.md`: on-chain spec (`expiry_date: Option<i64>`, padding 88→79), Key Fields table row, new "Optional Overall Expiry (ADR-0024)" usage section with code example.
- MkDocs nav unchanged (ADR dir is auto-discovered; payasyougo.md already in nav).
