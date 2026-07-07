---
# tributary-t9pc
title: Add eslint config to apps/checkout + apps/lando (lint scripts broken)
status: todo
type: task
priority: normal
created_at: 2026-07-07T07:01:36Z
updated_at: 2026-07-07T07:01:36Z
---

Surfaced by tributary-ahl2 / tributary-or5g. Both apps have `"lint": "eslint ..."` scripts in package.json but NO eslint config file. ESLint v9+ requires flat config (eslint.config.js). Running `pnpm --filter @tributary/checkout run lint` crashes with 'ESLint couldn't find an eslint.config.(js|mjs|cjs) file.' This blocks `pnpm -r run lint` from ever going green.

Same fix pattern as apps/api and apps/scheduler (see apps/scheduler/eslint.config.js, apps/api/eslint.config.js). Pre-existing — no diff from the lint-cleanup work.

## Acceptance
- [ ] Add eslint.config.js to apps/checkout (mirror apps/api pattern, scoped to src/)
- [ ] Add eslint.config.js to apps/lando (mirror apps/api pattern)
- [ ] Add eslint devDeps if missing (@eslint/js, eslint, typescript-eslint, globals — match apps/scheduler versions)
- [ ] `pnpm --filter @tributary/checkout run lint` runs without config crash
- [ ] `pnpm --filter @tributary-so/lando run lint` runs without config crash
- [ ] Triage any surfaced lint errors (fix trivial, document structural)
