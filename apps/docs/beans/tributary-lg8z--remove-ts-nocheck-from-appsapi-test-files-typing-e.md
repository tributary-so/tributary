---
# tributary-lg8z
title: Remove @ts-nocheck from apps/api test files (typing effort)
status: completed
type: task
priority: low
created_at: 2026-07-07T07:03:08Z
updated_at: 2026-07-08T13:38:37Z
---

Surfaced by tributary-or5g. 14 files in apps/api/src/__tests__ start with `// @ts-nocheck`. These were likely converted from JS without typing. The current eslint override turns OFF `@typescript-eslint/ban-ts-comment` for test files (documented deferral — see apps/api/eslint.config.js). Removing `@ts-nocheck` will surface hidden type errors that need fixing one by one.

This is the structural debt behind the override. Tests work fine today; this is about type safety and catching future regressions earlier.

## Files (14)
assets.route.test.ts, auth.test.ts, gateway.merchant.route.test.ts, issue-policy-token.integration.test.ts, jwks.test.ts, jwks.route.test.ts, onetime.route.test.ts, policy-create-redirect.e2e.test.ts, rateLimit.test.ts, skill.route.test.ts, subscription.route.test.ts, token-issuer.test.ts, tokens-proxy.service.test.ts, tokens.route.test.ts (verify full list with: grep -rl '@ts-nocheck' apps/api/src/__tests__/)

## Acceptance
- [x] Pick one file, remove `// @ts-nocheck`, run `tsc --noEmit`, fix surfaced errors
- [x] Repeat per file (can be done incrementally — each file is independent) — all 14 done
- [x] Once all 14 are typed, remove the `ban-ts-comment: off` override from apps/api/eslint.config.js
- [x] `pnpm --filter @tributary-so/api run build` stays green
- [x] `pnpm --filter @tributary-so/api test` stays green (no new failures)

## Notes
- Lower priority — tests pass today, this is hardening.
- Each file is a self-contained PR-sized chunk.
- Some `require()` patterns (also covered by the test override) may need conversion to ESM imports as part of this work.

## Work Log

Started 2026-07-08. Resolved 2026-07-08.

Correction: grep found exactly **14** files (initial miscount). `events.route.test.ts` WAS among them; `onetime.route.test.ts` was already typed (not in scope).

## Summary of Changes

Removed `// @ts-nocheck` from all 14 test files in `apps/api/src/__tests__/` and fixed every surfaced type error (115 → 0). Removed the `ban-ts-comment: off` eslint override that was the documented deferral behind this debt.

### New infrastructure
- `apps/api/tsconfig.test.json` — typecheck config that includes `__tests__/` (the build tsconfig excludes it). Run with `npx tsc --noEmit -p tsconfig.test.json`. Adds a `paths` mapping for `@tributary-so/sdk-react` → built dist types (needed by the integration test; not an api dependency).
- `apps/api/src/__tests__/utils/test-helpers.ts` — added explicit return type on `createMockResponse` to fix a TS2742 portability error (inferred type referenced a nested `jest-mock` path).

### Fix patterns applied
- `jest.mock()` auto-mocks returning `never`: cast `as jest.Mocked<typeof mod>` / `as jest.MockedFunction<typeof fn>` (the pattern already used in `onetime.service.test.ts` / `gateway.merchant.route.test.ts`).
- `jest.fn().mockResolvedValue(x)` inside factories: switched to `jest.fn(async () => x)` so the return type infers as a Promise.
- `mockRes()`/`mockReq()` helpers with narrow inferred types: annotated return as `any` (test fixtures, not SUT).
- `PolicyClaim` discriminated-union access without narrowing (`token-issuer.test.ts`): `as any` on each `buildPolicyClaims(...)[0]` result.
- `events.route.test.ts` fixture vs DB-row shape mismatch (`id: number` vs `Buffer`, event-name casing): typed the fixture `any`, cast the event-name literals.
- **Missing jest-global imports**: `token-issuer.test.ts` used ambient `jest` without importing it; `jwks.test.ts` used ambient `afterAll`. Added explicit `@jest/globals` imports (codebase convention) — these only surfaced at ts-jest runtime since the test typecheck config had `types: ["jest"]`.
- `issue-policy-token.integration.test.ts`: typed the `fetch` mock params so `mock.calls[0]` is a proper tuple.

### Verification
- `npx tsc --noEmit -p tsconfig.test.json` → 0 errors
- `pnpm --filter @tributary-so/api run build` → green
- `pnpm --filter @tributary-so/api run lint` → green
- `pnpm --filter @tributary-so/api test` → 2 failed / 204 passed / 208 total — **identical to the pre-change baseline** (the 2 failing suites, `subscription.route.test.ts` and `tokens.route.test.ts`, are pre-existing logic-test failures unrelated to typing). No new failures introduced.
