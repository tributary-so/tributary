---
# tributary-3wpj
title: Install flat-config ESLint across all TypeScript packages
status: completed
type: task
priority: normal
created_at: 2026-07-29T14:21:17Z
updated_at: 2026-07-29T14:35:10Z
---

## Summary of Changes

Added flat-config ESLint to all 6 TypeScript packages in packages/, matching the apps/ convention.

### Per-package configs
- sdk, sdk-x402, tokens-client, forward-builders: eslint.config.js (node+jest globals, no-explicit-any off, no-unused-vars with ^_ ignore).
- payments: eslint.config.mjs (CJS package, so .mjs forces ESM loading).
- sdk-react: eslint.config.js + eslint-plugin-react-hooks (browser+node globals).
- sdk-x402 and payments: test-file override allowing @ts-nocheck via ban-ts-comment (load-bearing for ts-jest on complex mock fixtures; documented in-config).
- lighthouse: untouched — vendored, source-less (dist only), private; existing "lint: exit 0" is correct.

### package.json updates (all 6)
- lint = "eslint ." and lint:fix = "eslint . --fix" (replaced "exit 0").
- devDeps: @eslint/js ^9.35.0, typescript-eslint ^8.59.0, globals ^16.4.0, eslint ^10.0.0.
- Removed stale old-style @typescript-eslint/eslint-plugin + parser from sdk and sdk-react.
- Removed unused react lint plugins from sdk-x402 (pure-TS package).
- Bumped typescript-eslint floor to ^8.59.0 (8.44 crashes on eslint 10 with "Class extends value undefined").

### Source fixes required to make lint pass
- Unused vars/imports/dead code removed or _-prefixed across all touched packages.
- payments validation.ts: I64_MAX literal -> Number(2n ** 63n - 1n) (no lossy literal, identical runtime value).
- sdk-react useActionCode.ts: clientRef?.current!.relay -> clientRef.current!.relay (no-unsafe-optional-chaining).
- sdk: removed 3 unused no-console eslint-disable directives.

### Verification
- pnpm run -r --filter "./packages/*" lint -> all 7 packages pass (sdk-react: 3 pre-existing react-hooks/exhaustive-deps warnings, non-blocking).
- Builds verified clean: sdk, payments, forward-builders, sdk-react; sdk-x402 tsc --noEmit clean.
