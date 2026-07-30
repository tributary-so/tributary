/**
 * Unit tests for the pools sync orchestrator (bean tributary-ssvc).
 *
 * Pins the orchestration contract, not the venue-specific fetch (jh0p) or the
 * token refresh glue (podi): normalizer registry, per-venue error isolation,
 * and the start/stop no-op guards. The dedicated DB pool accessor is NOT
 * exercised here (no live DB); getSyncDb is covered by the live-PG suite.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";

import {
  registerPoolNormalizer,
  runPoolsSyncTick,
  startPoolsSync,
  stopPoolsSync,
} from "../services/pools-sync";

describe("pools-sync orchestrator", () => {
  beforeEach(() => {
    stopPoolsSync();
  });

  afterEach(() => {
    stopPoolsSync();
    delete process.env.DATABASE_URL;
  });

  it("runs every registered normalizer on a tick", async () => {
    const a = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const b = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    registerPoolNormalizer("raydium", a);
    registerPoolNormalizer("meteora", b);

    await runPoolsSyncTick();

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("isolates failures: a throwing venue never blocks the others", async () => {
    const ok = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const boom = jest
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error("raydium 429"));
    registerPoolNormalizer("raydium", boom);
    registerPoolNormalizer("meteora", ok);

    // swallowing per-venue errors — resolves, does not throw
    await expect(runPoolsSyncTick()).resolves.toBeUndefined();

    expect(boom).toHaveBeenCalledTimes(1);
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it("is a no-op tick when no normalizers are registered", async () => {
    jest.resetModules();
    const fresh = await import("../services/pools-sync");
    await expect(fresh.runPoolsSyncTick()).resolves.toBeUndefined();
  });

  it("startPoolsSync is a no-op without DATABASE_URL", () => {
    delete process.env.DATABASE_URL;
    registerPoolNormalizer(
      "raydium",
      jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
    );
    expect(() => startPoolsSync()).not.toThrow();
  });

  it("startPoolsSync is a no-op without registered normalizers", () => {
    jest.resetModules();
    process.env.DATABASE_URL = "postgres://test";
    const fresh =
      require("../services/pools-sync") as typeof import("../services/pools-sync");
    expect(() => fresh.startPoolsSync()).not.toThrow();
    fresh.stopPoolsSync();
  });

  it("registerPoolNormalizer updates an existing venue in place (idempotent)", async () => {
    const first = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const second = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    registerPoolNormalizer("raydium", first);
    registerPoolNormalizer("raydium", second);

    await runPoolsSyncTick();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
