---
# tributary-peb4
title: 'Documentation: ADR-0024 + rest-api.md update for /v1/assets/*'
status: completed
type: feature
priority: normal
created_at: 2026-07-03T10:14:32Z
updated_at: 2026-07-06T08:06:38Z
parent: tributary-fxyo
blocked_by:
    - tributary-re15
---

New ADR capturing the tokens.xyz proxy decision + update API docs.

Files:
- `apps/docs/adr/0024-tokens-xyz-asset-catalog-proxy.md` — NEW. Decision: proxy via apps/api (not browser bundle), shaped ApiResponse (not thin passthrough), shared private tokens-client package. Rejected alternatives: ship key in bundle, edge function, fold into packages/sdk.
- `apps/docs/docs/api/rest-api.md` — document GET /v1/assets/search and GET /v1/assets/resolve with the response shapes from milestone D2.
- Update ADR map in AGENTS.md if convention requires.

Acceptance:
- [ ] ADR-0024 follows the format of existing ADRs (see 0001 as template)
- [ ] ADR names the decision, rejected alternatives, rationale
- [ ] rest-api.md includes /v1/assets/search and /v1/assets/resolve
- [ ] ADR references the milestone bean

## Summary of Changes

Docs landed in commit efce9d0:
- apps/docs/adr/0028-tokens-xyz-asset-catalog-proxy.md (NEW) — used 0028 not 0024, since 0024 was already taken by PayAsYouGo optional expiration
- apps/docs/docs/api/rest-api.md — documented GET /v1/assets/search + GET /v1/assets/resolve with full request/response examples and the failure-stance notes
