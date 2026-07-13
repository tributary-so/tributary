---
# tributary-61ow
title: Docs IA refactor for composable features
status: completed
type: epic
priority: high
tags:
    - docs
    - refactor
created_at: 2026-06-25T08:40:08Z
updated_at: 2026-06-25T18:08:35Z
---

Restructure apps/docs/ to accommodate the ComposablePolicy family (composable branch about to merge) and align with the 8 public-docs PRIs. Scope: (a) scaffold IA + stubs, document path to (c) full content. Static mkdocs build; OpenAPI spec auto-generated from Express JSDoc annotations.

## Children
1. T1 — OpenAPI: annotate Express routers + serve spec at /openapi.yaml
2. T2 — mkdocs.yml nav rewrite + file moves + defect fixes
3. T3 — swagger-ui-tag plugin + rest-api.md rewrite
4. T5 — Integration Guide → Programmable Pull Payments (6 pages, real content)
5. T6 — Protocol Reference → ComposablePolicy (7 pages, real content)
6. T7 — Protocol Reference top-level pages (7 pages, real content)

## Out of scope (per user)
- No bug bounty page (no program yet)
- No upgrade-authority page (about to change)
- No version archive (single state, evergreen)
- No AsyncAPI (fold WS docs into OpenAPI or plain markdown)
