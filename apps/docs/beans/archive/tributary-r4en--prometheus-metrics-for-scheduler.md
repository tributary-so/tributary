---
# tributary-r4en
title: Prometheus metrics for scheduler
status: completed
type: task
priority: high
created_at: 2026-07-22T16:08:01Z
updated_at: 2026-07-22T16:26:42Z
parent: tributary-y0g1
---

Add prom-client based metrics export to apps/scheduler. /metrics endpoint on METRICS_PORT (default 9100), configurable via env, opt-out via METRICS_ENABLED=false. Metrics: tx_total{kind,result}, tx_fail_total{kind,error_code}, rpc_calls_total{op} (Connection Proxy), watched_count{kind}, cooldown_count{kind}, tick_duration_seconds{kind}, tx_confirm_duration_seconds{kind}.

## Summary of Changes

### Files added
- `apps/scheduler/src/metrics.ts` — prom-client registry, 7 metrics, Connection Proxy wrapper, HTTP server on METRICS_PORT (default 9100), env-configurable.
- `tests/scheduler-metrics.test.ts` — 6 unit tests covering registration, label cardinality, gauges, histograms, Proxy behavior, and registry output. All green.

### Files modified
- `apps/scheduler/package.json` — added `prom-client ^15.1.3`.
- `apps/scheduler/src/index.ts` — boot `startMetricsServer()` before schedulers, `stopMetricsServer()` on SIGINT/SIGTERM.
- `apps/scheduler/src/payments.ts` — Connection wrap at construction, instrumented tick (duration + cooldown gauge), executePayment (dry_run + confirm duration + success), catch block (fail with parsed anchor error code).
- `apps/scheduler/src/composable.ts` — Connection wrap at construction, set watched_count after rescan, tick duration + cooldown gauge, fire (dry_run + confirm duration + success), catch block (fail with parsed anchor error code, also extracts SimulationFailed for pre-flight rejections).
- `apps/scheduler/Dockerfile` — `ENV METRICS_PORT=9100`, `EXPOSE 9100`.
- `jest.config.js` — `moduleNameMapper` to strip `.js` from relative imports (scheduler src uses ESM/bundler convention; ts-jest's node resolver needs the bare path). Scoped to relative imports only.

### Metrics exported
| Metric | Type | Labels |
|---|---|---|
| `tributary_scheduler_tx_total` | counter | `kind=payout|composable`, `result=success|fail|dry_run` |
| `tributary_scheduler_tx_fail_total` | counter | `kind`, `error_code` (anchor code or `unknown`/`SimulationFailed`) |
| `tributary_scheduler_rpc_calls_total` | counter | `op` (Connection method — catches y0g1 runaway pattern within one tick) |
| `tributary_scheduler_watched_count` | gauge | `kind=composable` |
| `tributary_scheduler_cooldown_count` | gauge | `kind` |
| `tributary_scheduler_tick_duration_seconds` | histogram | `kind` |
| `tributary_scheduler_tx_confirm_duration_seconds` | histogram | `kind` (send→confirmed wall-clock) |

Plus `prom-client`'s default process/node metrics (heap, event loop, GC, ...).

### Verification
- 6/6 unit tests pass (`npx jest tests/scheduler-metrics.test.ts`).
- Lint clean (`pnpm --filter @tributary-so/scheduler run lint`).
- tsup build clean.
- End-to-end smoke test: started server on :9100, scraped `/metrics`, verified all custom metrics + process metrics present with correct labels and values.
- Pre-existing scheduler-evaluator test failure is unrelated (jest ESM/CJS friction with the SDK dist); confirmed by stash/re-run.

### Notes
- HTTP server bind failure is non-fatal — scheduler keeps running without metrics. Next restart retries the port. Flip to fatal if you'd rather fail loud.
- Error code cardinality is bounded by Anchor's error enum (<100 codes). If we ever CPI into arbitrary programs, add an allowlist in `recordTxFail`.
- The Connection Proxy wraps once at scheduler construction — covers SDK-internal RPC paths too, no SDK edits needed.
