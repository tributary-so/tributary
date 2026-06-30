---
# tributary-dgxn
title: 'Drop static openapi.yaml — point docs to live API endpoint'
status: completed
type: task
priority: high
tags:
    - openapi
    - cleanup
created_at: 2026-06-25T00:00:00Z
updated_at: 2026-06-25T00:30:00Z
parent: tributary-61ow
---

The API server already generates the OpenAPI spec dynamically from JSDoc annotations via swagger-jsdoc, served at /openapi.yaml. No need to check in a static copy anywhere.

## Changes

- [x] Delete apps/api/openapi.yaml (generated at runtime, never checked in)
- [x] Delete apps/docs/docs/api/openapi.yaml (was a copy)
- [x] .gitignore both paths
- [x] Simplify apps/docs/Makefile (drop sync target, build just runs mkdocs build)
- [x] Point rest-api.md swagger-ui embed at https://api.tributary.so/openapi.yaml

## Verification

- [x] `make build` succeeds without any local yaml file
- [x] swagger-ui-tag plugin confirms assets copied successfully
- [x] CORS already enabled (app.use(cors()) in apps/api/src/index.ts)

## Summary of Changes

Deleted both static `openapi.yaml` copies (1,418 lines removed from the
repo). The API server generates the spec dynamically via swagger-jsdoc at
runtime; the docs embed points directly at `https://api.tributary.so/openapi.yaml`
(fetched client-side by Swagger UI). Simplified the Makefile — no more
`sync` target. Both paths are now gitignored.

One source of truth: the JSDoc annotations in the route files.
