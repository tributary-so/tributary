import { Connection, PublicKey } from "@solana/web3.js";
import {
  registry,
  recordTx,
  recordTxFail,
  setWatchedCount,
  setCooldownCount,
  observeTick,
  observeTxConfirm,
  wrapConnectionWithMetrics,
} from "../apps/scheduler/src/metrics";

// ponytail: single self-check file for the metrics module. Covers
// registration, recording helpers, Connection Proxy, and that the
// registry produces scrape-able output. No HTTP server exercised here
// (its only logic is registry.metrics() which we cover directly).

function reset(): void {
  registry.resetMetrics();
}

describe("scheduler metrics", () => {
  afterEach(reset);

  it("records tx outcomes by kind and result", async () => {
    recordTx("payout", "success");
    recordTx("payout", "success");
    recordTx("composable", "fail");
    recordTx("composable", "dry_run");

    const out = await registry.getMetricsAsJSON();
    const tx = out.find((m) => m.name === "tributary_scheduler_tx_total")!;
    expect(tx).toBeDefined();

    const byLabels = Object.fromEntries(
      tx.values.map(
        (v: any) =>
          [`${v.labels.kind}/${v.labels.result}`, v.value] as [string, number]
      )
    );
    expect(byLabels["payout/success"]).toBe(2);
    expect(byLabels["composable/fail"]).toBe(1);
    expect(byLabels["composable/dry_run"]).toBe(1);
  });

  it("records tx failures with error_code label", async () => {
    recordTxFail("composable", "InsufficientFunds");
    recordTxFail("composable", "InsufficientFunds");
    recordTxFail("composable", ""); // empty → unknown
    recordTxFail("payout", "DelegateExpired");

    const tx = (await registry.getMetricsAsJSON()).find(
      (m) => m.name === "tributary_scheduler_tx_fail_total"
    )!;
    const byLabels = Object.fromEntries(
      tx.values.map(
        (v: any) =>
          [`${v.labels.kind}/${v.labels.error_code}`, v.value] as [
            string,
            number
          ]
      )
    );
    expect(byLabels["composable/InsufficientFunds"]).toBe(2);
    expect(byLabels["composable/unknown"]).toBe(1);
    expect(byLabels["payout/DelegateExpired"]).toBe(1);
  });

  it("sets gauges (watched, cooldown) to latest value", async () => {
    setWatchedCount("composable", 42);
    setCooldownCount("payout", 3);
    setWatchedCount("composable", 50); // overwrite

    const gauges = await registry.getMetricsAsJSON();
    const watched = gauges.find(
      (m) => m.name === "tributary_scheduler_watched_count"
    )!;
    const cooldown = gauges.find(
      (m) => m.name === "tributary_scheduler_cooldown_count"
    )!;

    expect(watched.values[0].labels.kind).toBe("composable");
    expect(watched.values[0].value).toBe(50);
    expect(cooldown.values[0].labels.kind).toBe("payout");
    expect(cooldown.values[0].value).toBe(3);
  });

  it("observes tick and tx confirm durations into histograms", async () => {
    observeTick("payout", 0.42);
    observeTick("composable", 3.1);
    observeTxConfirm("composable", 1.7);

    const out = await registry.getMetricsAsJSON();
    const tick = out.find(
      (m) => m.name === "tributary_scheduler_tick_duration_seconds"
    )!;
    const confirm = out.find(
      (m) => m.name === "tributary_scheduler_tx_confirm_duration_seconds"
    )!;

    expect(tick.values.length).toBeGreaterThan(0);
    expect(confirm.values.length).toBeGreaterThan(0);

    const tickKinds = new Set(
      tick.values.map((v: any) => v.labels.kind).filter(Boolean)
    );
    expect(tickKinds.has("payout")).toBe(true);
    expect(tickKinds.has("composable")).toBe(true);
  });

  it("Connection Proxy increments rpc_calls_total on every method call", async () => {
    const fake = {
      getLatestBlockhash: async () => ({
        blockhash: "fake",
        lastValidBlockHeight: 1,
      }),
      getBalance: async () => 0,
      rpcEndpoint: "http://fake",
    } as unknown as Connection;

    const wrapped = wrapConnectionWithMetrics(fake);

    await wrapped.getLatestBlockhash();
    await wrapped.getLatestBlockhash();
    await wrapped.getBalance(new PublicKey(0));

    const rpc = (await registry.getMetricsAsJSON()).find(
      (m) => m.name === "tributary_scheduler_rpc_calls_total"
    )!;
    const byOp = Object.fromEntries(
      rpc.values.map((v: any) => [v.labels.op, v.value] as [string, number])
    );
    expect(byOp["getLatestBlockhash"]).toBe(2);
    expect(byOp["getBalance"]).toBe(1);
  });

  it("registry.metrics() produces text scrape output containing all metric names", async () => {
    recordTx("payout", "success");
    setWatchedCount("composable", 1);
    observeTick("payout", 0.5);

    const text = await registry.metrics();
    expect(text).toContain("tributary_scheduler_tx_total");
    expect(text).toContain("tributary_scheduler_watched_count");
    expect(text).toContain("tributary_scheduler_tick_duration_seconds");
    expect(text).toContain("tributary_scheduler_rpc_calls_total");
    expect(text).toContain("process_"); // default process metrics
  });
});
