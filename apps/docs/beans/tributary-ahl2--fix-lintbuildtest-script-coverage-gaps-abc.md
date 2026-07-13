---
# tributary-ahl2
title: Fix lint/build/test script coverage gaps (A+B+C)
status: completed
type: task
priority: high
created_at: 2026-07-06T18:19:17Z
updated_at: 2026-07-06T18:28:27Z
---

Audit found: root has no scripts (by design — Makefile orchestrates), but AGENTS.md lies about pnpm run lint; tests/ has no lint; apps/api has no lint and its jest runs e2e+integration; programs/tributary lint has rustftmp typo.

## Acceptance (A+B+C, no root scripts)

- [x] A1: AGENTS.md commands section reflects reality (no root scripts; lint via `pnpm -r run lint`)
- [x] A2: tests/ gains `lint` script + eslint.config.js (mirror apps/scheduler flat config)
- [x] B1: apps/api gains `lint` script + eslint.config.js
- [x] B2: apps/api jest excludes *.e2e.test.ts and *.integration.test.ts from default `test`; add `test:e2e` + `test:integration` escape hatches (mirror payments convention)
- [x] C: programs/tributary lint typo rustftmp → rustfmt
- [x] Verify: lint configs run cleanly (no config crashes); apps/api default test = 15 files (e2e+integration excluded); test:e2e=1, test:integration=1

## Summary of Changes

**A1 — AGENTS.md** (`AGENTS.md`): Rewrote Build/Test Commands section. Removed non-existent `pnpm run lint` / `pnpm run lint:fix` at root; documented that root has no scripts by design (Makefile orchestrates), and gave the real recursive commands (`pnpm -r run lint`, `pnpm --filter <pkg> run lint:fix`). Added the apps/api test commands and the Surfpool make targets.

**A2 — tests/** (`tests/package.json`, new `tests/eslint.config.js`): Added `"lint": "eslint ."` script + flat eslint config mirroring `apps/scheduler` (js.configs.recommended + tseslint.recommended, no-explicit-any off, unused-vars with `^_` ignore). Added eslint devDeps (`@eslint/js ^9.35.0`, `eslint ^10.0.0`, `typescript-eslint ^8.44.0`, `globals ^16.4.0`).

**B1 — apps/api** (`apps/api/package.json`, new `apps/api/eslint.config.js`): Added `"lint": "eslint ."` script + flat eslint config (same shape as tests/, scoped to `src/**` with `dist`/`coverage` ignored). Added the same eslint devDeps.

**B2 — apps/api jest** (`apps/api/package.json`, `apps/api/jest.config.ts`): Added `testPathIgnorePatterns: ["\\.e2e\\.test\\.ts$", "\\.integration\\.test\\.ts$"]` to jest.config.ts so the default `pnpm test` skips the 2 heavy suites. Added `test:e2e` and `test:integration` escape-hatch scripts (using `--testPathIgnorePatterns=xxx` to defeat the global ignore — empty string does NOT work in jest). Default test dropped from 17 → 15 files; escape hatches reach exactly 1 each.

**C — typo** (`programs/tributary/package.json`): `rustftmp` → `rustfmt`.

## Pre-existing lint debt (out of scope, follow-up suggested)

Running the new lints surfaced real pre-existing errors that were previously invisible:
- `tests/`: 26 errors (unused vars, prefer-const) — 6 auto-fixable
- `apps/api`: 56 errors (unused vars, prefer-const, no-this-alias) — 2 auto-fixable

These are code issues, not config issues. A separate bean should `pnpm --fix` the auto-fixable ones and decide policy on the rest. Did NOT touch them — surgical scope.
