---
# tributary-upc1
title: 'T3: swagger-ui-tag plugin + rest-api.md rewrite'
status: completed
type: task
priority: normal
tags:
    - openapi
    - docs
created_at: 2026-06-25T08:40:57Z
updated_at: 2026-06-25T08:46:29Z
parent: tributary-61ow
---

Wire the OpenAPI spec into the mkdocs static build. Add swagger-ui-tag plugin. Rewrite api/rest-api.md and api/websocket.md.

## Scope
- Add mkdocs-swagger-ui-tag to apps/docs/pyproject.toml
- Add a copy step to apps/docs/Makefile: 'build' target copies ../api/openapi.yaml → docs/api/openapi.yaml before mkdocs build
- Rewrite docs/api/rest-api.md: replace the 572-line hand-written endpoint docs with a thin page that embeds swagger-ui-tag pointing at openapi.yaml
- Rewrite docs/api/websocket.md: keep as plain markdown (WS events documented inline, no AsyncAPI)

## Verification
- mkdocs build succeeds
- api/rest-api.md renders an embedded Swagger UI
- The copy step works: ../api/openapi.yaml exists (T1 generates it)

## Dependency
T1 must generate apps/api/openapi.yaml before the build works. T3 can write all the wiring in parallel — the build will succeed once both land.

## Summary of Changes

- Added `mkdocs-swagger-ui-tag==0.7.1` to `apps/docs/pyproject.toml`
- Wired `swagger-ui-tag` plugin into `apps/docs/mkdocs.yml` (background: white, docExpansion: none)
- Rewrote `apps/docs/Makefile` with `sync` target that copies `../api/openapi.yaml` → `docs/api/openapi.yaml` before build/serve; documented the T1 dependency
- Rewrote `apps/docs/docs/api/rest-api.md` (572 lines → thin Swagger UI embed page with `swagger-ui` fence pointing at `openapi.yaml`, preserved auth note, SDK links)
- Cleaned up `apps/docs/docs/api/websocket.md`: added cross-link note to REST API, condensed the client-to-server events into a table, preserved all event payload shapes and code examples. No AsyncAPI.

Build will succeed once T1 lands `apps/api/openapi.yaml`. mkdocs.yml verified as valid YAML with swagger-ui-tag present in plugins.
