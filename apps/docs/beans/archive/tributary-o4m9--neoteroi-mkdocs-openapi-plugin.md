---
# tributary-o4m9
title: 'Replace swagger-ui-tag with neoteroi-mkdocs OAD plugin'
status: completed
type: task
priority: high
tags:
    - openapi
    - docs
created_at: 2026-06-25T01:00:00Z
updated_at: 2026-06-25T01:30:00Z
parent: tributary-61ow
---

Replace the `mkdocs-swagger-ui-tag` plugin (interactive JS widget, client-side fetch) with `neoteroi-mkdocs` OAD plugin (generates native Markdown at build time from the OpenAPI spec).

## Changes

- [x] Add `neoteroi-mkdocs==1.2.0` to `pyproject.toml`, remove `mkdocs-swagger-ui-tag`
- [x] Replace plugin config in `mkdocs.yml`: `swagger-ui-tag` → `neoteroi.mkdocsoad` with `use_pymdownx: true`
- [x] Download `css/mkdocsoad.css` from neoteroi v1.2.0 release assets → `docs/css/mkdocsoad.css`
- [x] Add `css/mkdocsoad.css` to `extra_css`
- [x] Rewrite `docs/api/rest-api.md` to use `[OAD(https://api.tributary.so/openapi.yaml)]`
- [x] Update Makefile with local-dev instructions
- [x] Verify end-to-end: API server serves spec → neoteroi fetches at build time → Markdown generated

## Verification

Build tested against a local API server (`localhost:3002/openapi.yaml`):
- neoteroi fetched the spec via HTTP GET
- Generated proper Markdown with tabbed sections, response tables, parameter docs
- `mkdocs build` succeeded (only pre-existing link warnings from moved files)

Production build will fail with 404 until `api.tributary.so` serves `/openapi.yaml` — expected per user instruction ("ignore if you see 404 errors").

## Summary of Changes

Switched from a client-side Swagger UI widget (JS-heavy, poor SEO, no search
indexing) to build-time Markdown generation via neoteroi-mkdocs. The API
docs are now native mkdocs pages — fully indexed, searchable, and rendered
with Material theme tabs/admonitions. One source of truth: the JSDoc
annotations in `apps/api/src/routes/*.ts`, served dynamically by the API
server at `/openapi.yaml`, fetched by neoteroi at `mkdocs build` time.
