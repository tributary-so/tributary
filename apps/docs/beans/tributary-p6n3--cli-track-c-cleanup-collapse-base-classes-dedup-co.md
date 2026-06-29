---
# tributary-p6n3
title: 'CLI: Track C cleanup — collapse base classes, dedup commands, fix README'
status: todo
type: task
priority: high
created_at: 2026-06-29T07:51:24Z
updated_at: 2026-06-29T07:51:24Z
parent: tributary-hy8a
---

Parent: `tributary-hy8a` — CLI v2 epic
Track: C (cleanup) · Blocked-by: none · Blocks: all other CLI children

## Requirement

Mechanical, behavior-preserving shrink of `apps/cli`. No new features, no
terminology changes, no command renamed/removed from the user's perspective
(`program config` is the only deletion — it is a pure duplicate of `pda config`).
Lands first so every other child builds on one collapsed base class + shared
runners instead of three near-identical ones.

## Spec

Pure refactor of `apps/cli/src`. Cite the epic's Ponytail review (~380–420
lines removable). Concrete moves:

- Collapse the 3 near-identical abstract base classes in `lib/` → **1** shared
  `BaseCommand`. Every command extends it.
- Collapse the duplicated command triplets via shared runners:
  - `subscription pause|resume|delete` (3 files) → share one status-mutation
    runner (still 3 commands until the rename child collapses them).
  - `pda/{config,delegate,gateway,payment-policy,user-payment}` (5 files) →
    share one PDA-lookup runner.
  - `gateway/{fee-bps,fee-recipient,signer}` (3 files) → share one
    gateway-mutation runner.
  - `referral/{show,show-owner}` (2 files) → share one referral-read runner.
- Delete `commands/program/config.ts` — it duplicates `pda config`. Keep
  `program/initialize.ts`.
- Fix `Buffer.alloc(64)` memo padding (use the SDK's `encodeMemo`, which is
  already the source of truth for memo bytes).
- Make `--policy` required on `payments execute` (today it silently no-ops if
  omitted).
- Regenerate README via the already-wired `oclif readme` (`prepack` script) —
  replaces the 470-line fictional README with the real command tree.
- Extract the 160-line inline `releaseRules` map to `.releaserc` **or** drop it
  if nothing consumes it (verify first; delete only if truly dead).

### Decisions cited (not re-decided)

- No ADR — mechanical. Parent epic's Ponytail review is the authority on what
  is removable. Behavior must be identical pre/post (existing tests are the
  guard).

## Acceptance Criteria

- [ ] `apps/cli/src` net line count drops by ≥350 lines.
- [ ] Exactly **one** base command class remains; no command imports a removed
      base.
- [ ] `program config` is gone; `pda config` output is unchanged.
- [ ] `oclif readme` runs clean in `prepack`; README lists only commands that
      actually exist.
- [ ] `releaseRules` either lives in `.releaserc` (consumed) or is deleted
      (verified dead).

## Test Plan

- `pnpm --filter @tributary-so/cli lint` (or repo `pnpm run lint`) clean.
- `pnpm --filter @tributary-so/cli build` succeeds.
- Smoke every command path against Surfpool: `cli subscription create`,
  `payments execute` (with `--policy`), `gateway fee-bps`, `pda config`,
  `referral show`. Outputs identical to pre-refactor (capture before/after).
- `oclif readme` diff contains only real commands.

## Workflow

routing: implementer · no external routing table supplied for this epic.
