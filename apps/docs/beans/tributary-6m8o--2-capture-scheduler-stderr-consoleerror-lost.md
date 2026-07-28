---
# tributary-6m8o
title: "#2 Capture scheduler stderr (console.error lost)"
status: completed
type: task
priority: critical
created_at: 2026-07-21T09:22:56Z
updated_at: 2026-07-22T10:15:04Z
parent: tributary-ben2
---

assigned: implementer

## Problem

apps/scheduler/src/payments.ts:147 (console.error Error executing payment) and apps/scheduler/src/composable.ts:538 (console.error Composable failed) both write to stderr. The production log (scheduler.log, 11MB) captures stdout only. Grep for the flag emoji, SendTransactionError, 'failed:' -> zero matches. Yet Errors: 19/20 per cycle. All failure diagnostics are silently discarded.

This blocks diagnosis of every other scheduler issue - implement this FIRST.

## Fix

- apps/scheduler/Dockerfile: ensure the runtime stage runs node with stderr merged (e.g. CMD ["node", "dist/index.js"] is fine - the issue is the docker logs / process manager invocation upstream). Verify docker logs captures stderr by default (it does unless overridden).
- If running under systemd/PM2/docker: document the 2>&1 requirement in apps/scheduler/README.md (existing Deployment section is sparse).
- Alternatively/in-addition: redirect stderr inside the node entrypoint so it always lands in the same stream as stdout, making the deployment-agnostic. apps/scheduler/src/index.ts can do: process.stderr.pipe(process.stdout) OR override console.error to also write to stdout with a [ERROR] prefix.

Preferred approach: the in-process redirect (defensive, deployment-agnostic) PLUS a README note. Do NOT silently change console.log/error semantics elsewhere.

## Acceptance

- Run scheduler locally, force a known failure (e.g. point at a closed port, or use --dry-run on a policy that won't fire), confirm the error text appears in the captured stdout stream.
- README has a 'Logging' subsection stating stderr is merged into stdout by default and how to split them back if needed.
- No behavior change for happy-path console.log output.

## Tags

scheduler, ops

## Summary of Changes

- **`apps/scheduler/src/index.ts`**: Added in-process stderr→stdout redirect at startup (before any logging). All stderr output (winston error/warn, uncaught exceptions, node warnings) now lands in stdout. Gated on `LOG_SPLIT_STREAMS=true` to restore separate streams when a log shipper handles stderr independently.
- **`apps/scheduler/README.md`**: Updated Logging section — documented merged-by-default stream routing, added `LOG_SPLIT_STREAMS` env var to the table, explained how to split streams back, and why merging is the default (docker logs / systemd stdout-only capture was silently discarding all error diagnostics).
