// Tests for the discriminated TributaryConfig union + soft-deprecation shim.
// Feature tributary-zre4 (milestone tributary-f6yh, Axis 5).

import {
  TributaryConfig,
  LegacyTributaryConfig,
  TRIBUTARY_CONFIG_VARIANTS,
  isTributaryConfigVariant,
  resolveTributaryConfig,
} from "../types/tributary";

const PK = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

describe("TributaryConfig discriminated union (Axis 5)", () => {
  it("exposes exactly the 6 coexisting modes", () => {
    expect(TRIBUTARY_CONFIG_VARIANTS).toEqual([
      "subscription",
      "milestone",
      "payAsYouGo",
      "oneTime",
      "upTo",
      "payment",
    ]);
  });

  it("isTributaryConfigVariant guards the discriminator", () => {
    for (const v of TRIBUTARY_CONFIG_VARIANTS) {
      expect(isTributaryConfigVariant(v)).toBe(true);
    }
    expect(isTributaryConfigVariant("bogus")).toBe(false);
    expect(isTributaryConfigVariant(undefined)).toBe(false);
    expect(isTributaryConfigVariant(123)).toBe(false);
  });
});

describe("resolveTributaryConfig shim", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it.each(TRIBUTARY_CONFIG_VARIANTS)(
    "passes the %s variant through unchanged without warning",
    (variant) => {
      const input = sampleVariant(variant);
      const out = resolveTributaryConfig(input);
      expect(out).toEqual(input);
      expect(warnSpy).not.toHaveBeenCalled();
    },
  );

  it("translates the legacy interface to the subscription variant and warns", () => {
    const legacy: LegacyTributaryConfig = {
      gateway: PK,
      recipient: PK,
      trackingId: "trib_legacy",
      autoRenew: true,
      memo: "legacy memo",
    };

    const out = resolveTributaryConfig(legacy);

    expect(out).toEqual({
      variant: "subscription",
      gateway: PK,
      recipient: PK,
      trackingId: "trib_legacy",
      autoRenew: true,
      memo: "legacy memo",
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/deprecated/i);
  });

  it("rejects input that is neither a variant nor the legacy shape", () => {
    expect(() => resolveTributaryConfig({} as any)).toThrow(/variant/i);
    expect(() => resolveTributaryConfig({ variant: "nope" } as any)).toThrow(
      /variant/i,
    );
    expect(() => resolveTributaryConfig(null as any)).toThrow();
  });
});

/** Build a minimal valid TributaryConfig for each variant. */
function sampleVariant(variant: string): TributaryConfig {
  switch (variant) {
    case "subscription":
      return {
        variant: "subscription",
        gateway: PK,
        recipient: PK,
        trackingId: "t",
        autoRenew: true,
        paymentFrequency: "monthly",
      };
    case "milestone":
      return {
        variant: "milestone",
        gateway: PK,
        recipient: PK,
        trackingId: "t",
        milestoneAmounts: [100, 200],
        milestoneTimestamps: [1_700_000_000, 1_710_000_000],
        releaseCondition: 0b0001,
        totalMilestones: 2,
      };
    case "payAsYouGo":
      return {
        variant: "payAsYouGo",
        gateway: PK,
        recipient: PK,
        trackingId: "t",
        maxAmountPerPeriod: 1000,
        maxChunkAmount: 100,
        periodLengthSeconds: 86400,
      };
    case "oneTime":
      return {
        variant: "oneTime",
        gateway: PK,
        recipient: PK,
        trackingId: "t",
        amount: 500,
      };
    case "upTo":
      return {
        variant: "upTo",
        gateway: PK,
        recipient: PK,
        trackingId: "t",
        maxAmount: 500,
        deadline: 1_800_000_000,
      };
    case "payment":
      return {
        variant: "payment",
        recipient: PK,
        trackingId: "t",
        amount: 250,
      };
    default:
      throw new Error(`unknown variant ${variant}`);
  }
}
