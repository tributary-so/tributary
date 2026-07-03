---
# tributary-yjo0
title: 'Documentation: ADR-0023 + merchant-layer docs page'
status: todo
type: feature
priority: normal
created_at: 2026-07-03T09:12:27Z
updated_at: 2026-07-03T09:12:27Z
parent: tributary-mohi
---

## What

Capture the rationale locked during the grilling so a future reader (or agent) understands why the merchant layer looks the way it does, and what was deliberately deferred.

## Deliverables

### `apps/docs/adr/0023-gateway-merchant-layer.md`
Number confirmed (0001–0022 exist; next is 0023). Follow the format of `0001-…md`. Decision + rejected alternatives + rationale. Must capture:
- **Decision:** Ship the merchant layer as an incremental feature inside `apps/app` + `apps/api` — derived on-the-fly from the events table, wallet-only subscribers, authority-JWT auth, no SaaS.
- **Rejected:** (a) hosted multi-tenant SaaS; (b) standalone self-hosted reference app; (c) off-chain plan registry; (d) enriched subscriber profiles; (e) materialized snapshot table; (f) churn analytics in v1; (g) invoicing/PDF receipts in v1.
- **Rationale per rejection** (one line each).
- **Key definition:** "MRR = on-chain-active Subscription volume, monthly-normalized; NOT churn-adjusted; silent churn is invisible (no payment-failure event)." State the ceiling and the upgrade triggers (gateway > ~1k active policies → materialize; churn needed → add scheduler-reported `PaymentMissed`).
- **Auth:** authority read from chain, not a platform DB; JWT reuses `signingKeys`/`jwks`.

### `apps/docs/` merchant-layer page (what/how)
A short page under the existing docs site structure: what the merchant layer shows an operator, how to enable it (authority wallet sign), the MRR definition + its honest limitations, and the endpoint catalog table (copy from the milestone). Link to ADR-0023 for the why.

## Acceptance

- [ ] ADR-0023 merged, added to the ADR table in `AGENTS.md` and the docs nav.
- [ ] Merchant-layer docs page renders in the mkdocs site (`mkdocs serve`).
- [ ] The MRR definition and its "not churn-adjusted" caveat appear verbatim in both the ADR and the docs page and the `<RevenueSection>` UI footnote (single source of truth — the milestone body).

## Notes

- ADR is authority on rationale; code is authority on state. If implementation reveals one of these decisions was wrong, update the ADR — do not silently diverge.
