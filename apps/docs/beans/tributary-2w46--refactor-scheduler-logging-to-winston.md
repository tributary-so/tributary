---
# tributary-2w46
title: Refactor scheduler logging to winston
status: todo
type: task
priority: normal
created_at: 2026-07-21T09:24:26Z
updated_at: 2026-07-21T09:25:10Z
blocked_by:
    - tributary-y0g1
---

assigned: implementer

## Goal

Replace the scattered console.log/console.error calls across apps/scheduler/src/{index,payments,composable,evaluator}.ts with a structured winston logger. Decouples transport (stdout/stderr/file/remote) from call sites, gives us levels (error/warn/info/debug), JSON option for machine parsing, and unblocks task #8's per-tier log-level control.

## Scope

NOT under any active milestone. Tracked standalone. Logically depends on milestone tributary-y0g1 (Scheduler ops hygiene) landing first so the refactor integrates with the new cooldown/summary logging rather than fighting it.

## Proposed change

- Add winston dependency to apps/scheduler/package.json.
- New file apps/scheduler/src/logger.ts exporting a configured winston logger:
  - Default level from LOG_LEVEL env (default 'info').
  - Format: timestamp + level + message; JSON when LOG_FORMAT=json.
  - Transports: Console (with stderr for error/warn, stdout for info/debug - this fixes the stderr-capture issue from task #2 properly).
  - Optional File transport when LOG_FILE set (rotating if LOG_ROTATE=true).
- Replace every console.log/error in src/ with logger.info/error/warn/debug:
  - composable.ts: ~15 call sites
  - payments.ts: ~12 call sites
  - index.ts: ~8 call sites (mostly startup banner)
  - evaluator.ts: 0 (pure functions)
- Demote per-policy-iteration logs (e.g. 'on cooldown - skipping', 'validation prefilter: assertion not satisfied') to logger.debug so default output drops them.
- Promote tick summaries (task #8) and errors to logger.info / logger.error.
- Update apps/scheduler/README.md: new env vars (LOG_LEVEL, LOG_FORMAT, LOG_FILE, LOG_ROTATE).

## Decisions to confirm before implementing

1. Replace task #2's in-process stderr redirect with winston's level->stream mapping? Recommended: yes - winston handles this natively and cleanly.
2. Keep human-readable default, JSON opt-in? Recommended: yes (matches production use).
3. Single logger instance or child loggers per scheduler? Recommended: single instance, modules import it.

## Acceptance

- pnpm build succeeds, scheduler starts.
- LOG_LEVEL=debug shows per-policy attempts; LOG_LEVEL=info shows only tick summaries + errors.
- LOG_FORMAT=json produces valid JSON per line (verify with jq).
- Errors land on stderr (verify with process.stderr separately captured).
- README documents the new env vars.
- No console.log/error remaining in src/ (eslint rule could enforce).
