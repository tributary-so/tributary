---
# tributary-v8sp
title: 'fix(api): /openapi.yaml serves empty paths in Docker — copy src/routes into runtime image'
status: completed
type: bug
priority: high
created_at: 2026-08-03T16:03:30Z
updated_at: 2026-08-03T16:40:44Z
---

swagger-jsdoc scans `./src/routes/*.ts` at runtime (openapi.ts:115 apis glob) to extract @openapi JSDoc blocks. The Dockerfile runtime stage (tsup bundle, bean tributary-z74k) only copies dist/index.js + dist/index.js.map — no source tree. So in production the glob matches zero files and paths: {} is served. Locally the source exists so it works.

## Fix (Option A — ponytail, one COPY line)
- [ ] apps/api/Dockerfile: COPY src/routes into the runtime stage so swagger-jsdoc can scan it
- [ ] Document why in the Dockerfile comment
- [ ] Verify: docker build + curl /openapi.yaml shows paths populated

## Out of scope
Option B (build-time codegen → static JSON import) is the proper long-term fix. Defer unless the prod-image-ships-source concern becomes real (it won't — it's route JSDoc comments, ~20KB).

## Summary of Changes

### Root cause
swagger-jsdoc scans `./src/routes/*.ts` at RUNTIME (`openapi.ts` `apis` glob) to extract `@openapi` JSDoc blocks — it is not a compile-time step. The tsup bundle (bean tributary-z74k) inlines the code into `dist/index.js` but NOT the source comments the spec is built from. The Dockerfile runtime stage copied only `dist/index.js` + `.map`, so the glob matched zero files → `paths: {}` served in production.

### Fix
`apps/api/Dockerfile` — added one COPY line in the runtime stage:
```dockerfile
COPY --from=builder /app/apps/api/src/routes /app/src/routes
```
Plus a 6-line comment explaining the runtime-scan contract and why the source tree must be present (so the next person doesn't 'optimize' it back out).

### Verification
Built `tributary-api:openapi-fix-test` from the patched Dockerfile, ran it, curled `/openapi.yaml`:
- **paths populated: 40** (was `paths: {}` before)
- `/v1/pools/search`, `/v1/webhooks`, `/v1/tokens/issue`, `/v1/events/*`, `/v1/assets/*`, etc. all present
- `info`/`servers`/`components`/`tags` unchanged (those were always populated from the inline `definition` block)

Container + image cleaned up after verification.

### Long-term alternative (deferred)
Option B: codegen the spec at build time into a static JSON and import it, eliminating the runtime file-scan and the need to ship route sources. Not worth it now — the copied tree is ~20KB of JSDoc comments.
