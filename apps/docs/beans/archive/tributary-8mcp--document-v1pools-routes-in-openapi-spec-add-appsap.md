---
# tributary-8mcp
title: Document /v1/pools routes in OpenAPI spec + add apps/api/AGENTS.md
status: completed
type: task
priority: normal
created_at: 2026-08-02T17:19:14Z
updated_at: 2026-08-02T17:21:53Z
---

The /v1/pools/search route has no @openapi JSDoc annotation, so it's missing from /openapi.json and /openapi.yaml. Add the annotation (mirror assets.ts pattern), add the Pools tag to openapi.ts, and create apps/api/AGENTS.md instructing agents to always annotate new routes.

## Summary of Changes

- **`src/routes/pools.ts`**: added `@openapi` JSDoc annotation above the `/search` route (mirror of `assets.ts`), documenting query params (q/venue/limit), the inline response schema, 400/429 error envelopes, and the ADR-0028 D3 empty-not-500 failure stance.
- **`src/openapi.ts`**: registered the `Pools` tag in the `tags` array so Swagger UI groups it correctly.
- **`apps/api/AGENTS.md`** (new): standing instruction that every new route in `src/routes/*.ts` MUST ship with a `@openapi` annotation, must reference a tag declared in `openapi.ts`, and must be verified via the runtime spec. Includes a copy-pasteable annotation template and a verification one-liner.

Verified: `npx tsx` load of `openapiSpec.paths` now lists `/v1/pools/search`; `Pools` tag present; `tsc --noEmit` and `pnpm run lint` both clean.
