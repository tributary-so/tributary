import http from "http";
import { Connection } from "@solana/web3.js";
import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
} from "prom-client";
import { logger } from "./logger.js";

// Single shared registry. collectDefaultMetrics adds process/node metrics
// (heap, event loop, GC, ...) — free signal, no reason to skip.
export const registry = new Registry();
collectDefaultMetrics({ register: registry });

// ── Metric definitions ───────────────────────────────────────────────────
// Label cardinality is bounded by design:
//   kind ∈ {payout, composable}
//   result ∈ {success, fail, dry_run}
//   error_code: anchor code string, falls back to "unknown"; capped to a
//     handful of distinct codes by the program's error enum.
//   op: Connection method name — bounded by @solana/web3.js's surface.

export const txTotal = new Counter({
  name: "tributary_scheduler_tx_total",
  help: "Transactions attempted by the scheduler.",
  labelNames: ["kind", "result"] as const,
  registers: [registry],
});

export const txFailTotal = new Counter({
  name: "tributary_scheduler_tx_fail_total",
  help: "Failed transactions, broken down by anchor error code.",
  labelNames: ["kind", "error_code"] as const,
  registers: [registry],
});

export const rpcCallsTotal = new Counter({
  name: "tributary_scheduler_rpc_calls_total",
  help: "RPC calls dispatched through the scheduler's Connection.",
  labelNames: ["op"] as const,
  registers: [registry],
});

export const watchedCount = new Gauge({
  name: "tributary_scheduler_watched_count",
  help: "Policies currently watched by the composable scheduler.",
  labelNames: ["kind"] as const,
  registers: [registry],
});

export const cooldownCount = new Gauge({
  name: "tributary_scheduler_cooldown_count",
  help: "Policies currently in cooldown (backoff).",
  labelNames: ["kind"] as const,
  registers: [registry],
});

export const tickDurationSeconds = new Histogram({
  name: "tributary_scheduler_tick_duration_seconds",
  help: "Wall-clock duration of one scheduler tick.",
  labelNames: ["kind"] as const,
  // Buckets cover 10ms (no-op tick) to ~5min (slow mainnet sweep).
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
  registers: [registry],
});

export const txConfirmDurationSeconds = new Histogram({
  name: "tributary_scheduler_tx_confirm_duration_seconds",
  help: "Time from sendTransaction to confirmed commitment (sendAndConfirm wall-clock).",
  labelNames: ["kind"] as const,
  // Solana confirmation usually lands in 400ms–10s on mainnet.
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 30, 60],
  registers: [registry],
});

// ── Helpers ──────────────────────────────────────────────────────────────

type SchedulerKind = "payout" | "composable";

export function recordTx(
  kind: SchedulerKind,
  result: "success" | "fail" | "dry_run"
): void {
  txTotal.labels({ kind, result }).inc();
}

export function recordTxFail(kind: SchedulerKind, errorCode: string): void {
  // ponytail: no explicit cardinality cap — error_code is bounded by the
  // program's error enum (Anchor generates <100 codes). If we ever CPI into
  // arbitrary programs, add a known-code allowlist here.
  txFailTotal.labels({ kind, error_code: errorCode || "unknown" }).inc();
}

export function setWatchedCount(kind: SchedulerKind, n: number): void {
  watchedCount.labels({ kind }).set(n);
}

export function setCooldownCount(kind: SchedulerKind, n: number): void {
  cooldownCount.labels({ kind }).set(n);
}

export function observeTick(kind: SchedulerKind, seconds: number): void {
  tickDurationSeconds.labels({ kind }).observe(seconds);
}

export function observeTxConfirm(kind: SchedulerKind, seconds: number): void {
  txConfirmDurationSeconds.labels({ kind }).observe(seconds);
}

/**
 * Wraps a Connection in a Proxy that increments rpc_calls_total on every
 * method invocation. Catches the y0g1 runaway pattern (100x duplicate
 * policies × 4-6 calls each per tick) — the histogram would have surfaced
 * it within one 30s tick instead of 23h of log mining.
 *
 * Only function-valued properties are intercepted; getters (commitment,
 * rpcEndpoint) pass through untouched.
 */
export function wrapConnectionWithMetrics(conn: Connection): Connection {
  return new Proxy(conn, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        const op = String(prop);
        // ponytail: bound function ref to target — preserves `this` binding
        // for Connection's internal state (rpcEndpoint, commitment prefs).
        const fn = value.bind(target);
        return (...args: unknown[]) => {
          rpcCallsTotal.labels({ op }).inc();
          return fn(...args);
        };
      }
      return value;
    },
  }) as Connection;
}

// ── HTTP server ──────────────────────────────────────────────────────────

let server: http.Server | null = null;

export function startMetricsServer(): http.Server | null {
  const enabled = process.env.METRICS_ENABLED !== "false";
  if (!enabled) {
    logger.info("Metrics disabled (METRICS_ENABLED=false)");
    return null;
  }
  const port = Number(process.env.METRICS_PORT ?? 9100);

  server = http.createServer(async (req, res) => {
    if (req.url === "/metrics") {
      try {
        res.writeHead(200, { "Content-Type": registry.contentType });
        res.end(await registry.metrics());
      } catch (err) {
        logger.error("metrics scrape error:", err);
        res.writeHead(500);
        res.end("metrics collection error");
      }
      return;
    }
    res.writeHead(404);
    res.end("not found");
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      logger.error(
        `metrics port ${port} in use — set METRICS_PORT or disable with METRICS_ENABLED=false`
      );
    } else {
      logger.error("metrics server error:", err);
    }
    // Non-fatal: scheduler can keep running without metrics. The next
    // restart will retry the port. (Exit if you'd rather fail loud.)
  });

  server.listen(port, () => {
    logger.info(`Metrics listening on :${port}/metrics`);
  });

  return server;
}

export async function stopMetricsServer(): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = null;
}
