---
# tributary-tspw
title: 'Documentation: ADR-0021 + AGENTS.md for PayAsYouGo expiry'
status: todo
type: feature
priority: normal
created_at: 2026-07-02T13:05:13Z
updated_at: 2026-07-02T13:05:39Z
parent: tributary-f99q
---

Lock in the decision and update docs. Parent milestone: tributary-f99q. May proceed in parallel (decision is already settled).

## Acceptance criteria

- [ ] **ADR-0021**: "Optional PayAsYouGo expiration (per-variant field)". Decision + rejected alternatives (top-level hoist; Subscription/Milestone expiry) + rationale. Use `apps/docs/adr/0020-…md` as the template.
- [ ] Update `AGENTS.md` PolicyType table — PayAsYouGo row notes optional `expiry_date` (`None` = never); add ADR-0021 to the v2 ADR map + link list.
- [ ] apps/docs MkDocs pages touched if any describe PayAsYouGo scheduling.
