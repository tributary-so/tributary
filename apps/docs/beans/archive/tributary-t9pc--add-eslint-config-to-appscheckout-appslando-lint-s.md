---
# tributary-t9pc
title: Add eslint config to apps/checkout + apps/lando (lint scripts broken)
status: completed
type: task
priority: normal
created_at: 2026-07-07T07:01:36Z
updated_at: 2026-07-08T13:25:25Z
---

Surfaced by tributary-ahl2 / tributary-or5g. Both apps have `"lint": "eslint ..."` scripts in package.json but NO eslint config file. ESLint v9+ requires flat config (eslint.config.js). Running `pnpm --filter @tributary/checkout run lint` crashes with 'ESLint couldn't find an eslint.config.(js|mjs|cjs) file.' This blocks `pnpm -r run lint` from ever going green.

Same fix pattern as apps/api and apps/scheduler (see apps/scheduler/eslint.config.js, apps/api/eslint.config.js). Pre-existing — no diff from the lint-cleanup work.

## Acceptance

- [x] Add eslint.config.js to apps/checkout (mirror apps/api pattern, scoped to src/)
- [x] Add eslint.config.js to apps/lando (mirror apps/api pattern)
- [x] Add eslint devDeps if missing (@eslint/js, eslint, typescript-eslint, globals — match apps/scheduler versions)
- [x] `pnpm --filter @tributary/checkout run lint` runs without config crash
- [x] `pnpm --filter @tributary-so/lando run lint` runs without config crash
- [x] Triage any surfaced lint errors (fix trivial, document structural)

## Summary of Changes

Unblocked `pnpm -r run lint` for the two React/vite apps that shipped a
`lint` script but no ESLint v9 flat config.

- **apps/checkout/eslint.config.js** (new) — flat config mirroring the
  apps/api pattern: `js.configs.recommended` + `tseslint.configs.recommended`,
  scoped to `src/**/*.{ts,tsx}`, with the shared `no-unused-vars` rule
  (`^_` ignore pattern). Uses `globals.browser` (these are browser apps,
  not node like api/scheduler).
- **apps/lando/eslint.config.js** (new) — identical pattern.
- **apps/checkout/package.json** — added missing devDeps `typescript-eslint`
  (`^8.44.0`) and `globals` (`^16.4.0`), matching apps/scheduler versions;
  lando already declared both. Also fixed the `lint`/`lint:fix` scripts:
  the `--ext ts,tsx` flag is invalid under ESLint v9 flat config and crashed
  even with a config present, so scripts are now plain `eslint .` / `--fix`
  (the `files` glob in the config scopes linting to `src/`).
- **apps/checkout/src/pay-page.tsx** — one trivial lint fix surfaced by the
  new config: unused caught error `err` → `_err` (matches the `^_` ignore
  pattern). No other lint errors in either app.
- **pnpm-lock.yaml** — regenerated to record checkout's new direct devDeps.

Verification: both `pnpm --filter @tributary/checkout run lint` and
`pnpm --filter @tributary-so/lando run lint` exit 0; checkout `tsc --noEmit`
passes.
