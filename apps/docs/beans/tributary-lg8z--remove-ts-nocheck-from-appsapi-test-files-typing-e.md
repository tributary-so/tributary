---
# tributary-lg8z
title: Remove @ts-nocheck from apps/api test files (typing effort)
status: todo
type: task
priority: low
created_at: 2026-07-07T07:03:08Z
updated_at: 2026-07-07T07:03:08Z
---

Surfaced by tributary-or5g. 14 files in apps/api/src/__tests__ start with `// @ts-nocheck`. These were likely converted from JS without typing. The current eslint override turns OFF `@typescript-eslint/ban-ts-comment` for test files (documented deferral — see apps/api/eslint.config.js). Removing `@ts-nocheck` will surface hidden type errors that need fixing one by one.

This is the structural debt behind the override. Tests work fine today; this is about type safety and catching future regressions earlier.

## Files (14)
assets.route.test.ts, auth.test.ts, gateway.merchant.route.test.ts, issue-policy-token.integration.test.ts, jwks.test.ts, jwks.route.test.ts, onetime.route.test.ts, policy-create-redirect.e2e.test.ts, rateLimit.test.ts, skill.route.test.ts, subscription.route.test.ts, token-issuer.test.ts, tokens-proxy.service.test.ts, tokens.route.test.ts (verify full list with: grep -rl '@ts-nocheck' apps/api/src/__tests__/)

## Acceptance
- [ ] Pick one file, remove `// @ts-nocheck`, run `tsc --noEmit`, fix surfaced errors
- [ ] Repeat per file (can be done incrementally — each file is independent)
- [ ] Once all 14 are typed, remove the `ban-ts-comment: off` override from apps/api/eslint.config.js
- [ ] `pnpm --filter @tributary-so/api run build` stays green
- [ ] `pnpm --filter @tributary-so/api test` stays green (no new failures)

## Notes
- Lower priority — tests pass today, this is hardening.
- Each file is a self-contained PR-sized chunk.
- Some `require()` patterns (also covered by the test override) may need conversion to ESM imports as part of this work.
