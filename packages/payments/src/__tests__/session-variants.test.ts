// Round-trip + path tests for the extended 6-variant session encoding.
// Feature tributary-nx0s (milestone tributary-f6yh, Axis 3/4).

import { CheckoutSessionManager, CheckoutParams } from "../core/session";

const PK = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const manager = new CheckoutSessionManager();

const blobOf = (url: string) => url.split("/").pop() as string;

describe("encodeUrl path selection per mode (Axis 3)", () => {
  it("emits /subscribe/ for subscription", () => {
    const url = manager.encodeUrl(subscription());
    expect(url).toMatch(/\/subscribe\/[^/]+$/);
  });

  it("emits /pay/ for payment (direct transfer)", () => {
    const url = manager.encodeUrl(payment());
    expect(url).toMatch(/\/pay\/[^/]+$/);
  });

  it.each(["milestone", "payAsYouGo", "oneTime", "upTo"] as const)(
    "emits /policy/ for %s",
    (mode) => {
      const url = manager.encodeUrl(sampleFor(mode));
      expect(url).toMatch(/\/policy\/[^/]+$/);
    }
  );
});

describe("encodeUrl → decodeUrl round-trip (Axis 4)", () => {
  it.each([
    "subscription",
    "milestone",
    "payAsYouGo",
    "oneTime",
    "upTo",
    "payment",
  ] as const)("round-trips %s identically", (mode) => {
    const original = sampleFor(mode);
    const decoded = manager.decodeUrl(blobOf(manager.encodeUrl(original)));

    expect(decoded).toEqual(original);
  });

  it("preserves optional numeric fields (oneTime due/expiry, upTo validAfter)", () => {
    const original: CheckoutParams = {
      mode: "oneTime",
      tokenMint: PK,
      recipient: PK,
      gateway: PK,
      amount: 500,
      dueDate: 1_700_000_000,
      expiryDate: 1_800_000_000,
      trackingId: "t",
      memo: "scheduled one-shot",
      cluster: "mainnet",
    };
    expect(manager.decodeUrl(blobOf(manager.encodeUrl(original)))).toEqual(
      original
    );

    const upTo: CheckoutParams = {
      mode: "upTo",
      tokenMint: PK,
      recipient: PK,
      gateway: PK,
      maxAmount: 1000,
      validAfter: 1_700_000_000,
      deadline: 1_800_000_000,
      trackingId: "t",
      cluster: "mainnet",
    };
    expect(manager.decodeUrl(blobOf(manager.encodeUrl(upTo)))).toEqual(upTo);
  });

  it("round-trips explicit cluster for a /policy/ variant", () => {
    const original = { ...sampleFor("milestone"), cluster: "devnet" as const };
    const decoded: any = manager.decodeUrl(blobOf(manager.encodeUrl(original)));
    expect(decoded.cluster).toBe("devnet");
  });

  it("omitted optionals come back as undefined (not 'null')", () => {
    const decoded: any = manager.decodeUrl(
      blobOf(manager.encodeUrl(sampleFor("oneTime")))
    );
    expect(decoded.dueDate).toBeUndefined();
    expect(decoded.expiryDate).toBeUndefined();
  });
});

describe("legacy aliases", () => {
  it("encodeSubscriptionUrl delegates to encodeUrl (/subscribe/)", () => {
    const url = manager.encodeSubscriptionUrl(subscription() as any);
    expect(url).toMatch(/\/subscribe\//);
    expect(manager.decodeSubscriptionUrl(blobOf(url))).toEqual(subscription());
  });
});

describe("decode error handling", () => {
  it("rejects an unknown mode discriminator", () => {
    const bad = Buffer.from(
      JSON.stringify({
        m: "bogus",
        tm: PK,
        r: PK,
        a: "10",
        tid: "t",
        su: "null",
        cu: "null",
      })
    ).toString("base64");
    expect(() => manager.decodeUrl(bad)).toThrow(/mode|invalid/i);
  });

  it("rejects a policy variant missing its gateway", () => {
    const bad = Buffer.from(
      JSON.stringify({
        m: "milestone",
        tm: PK,
        r: PK,
        ma: "[100]",
        mt: "[1700000000]",
        rc: "1",
        tn: "1",
        tid: "t",
        su: "null",
        cu: "null",
      })
    ).toString("base64");
    expect(() => manager.decodeUrl(bad)).toThrow(/gateway/i);
  });
});

// ---- fixtures ---------------------------------------------------------------

function subscription(): CheckoutParams {
  return {
    mode: "subscription",
    tokenMint: PK,
    recipient: PK,
    gateway: PK,
    amount: 10,
    autoRenew: true,
    maxRenewals: null,
    paymentFrequency: "monthly",
    startTime: null,
    trackingId: "trib_test",
    lineItems: [],
    cluster: "mainnet",
  };
}

function payment(): CheckoutParams {
  return {
    mode: "payment",
    tokenMint: PK,
    recipient: PK,
    amount: 10,
    trackingId: "trib_test",
    cluster: "mainnet",
  };
}

function sampleFor(mode: string): CheckoutParams {
  switch (mode) {
    case "subscription":
      return subscription();
    case "payment":
      return payment();
    case "milestone":
      return {
        mode: "milestone",
        tokenMint: PK,
        recipient: PK,
        gateway: PK,
        milestoneAmounts: [100, 200, 300],
        milestoneTimestamps: [1_700_000_000, 1_710_000_000, 1_720_000_000],
        releaseCondition: 0b0001,
        totalMilestones: 3,
        trackingId: "t",
        cluster: "mainnet",
      };
    case "payAsYouGo":
      return {
        mode: "payAsYouGo",
        tokenMint: PK,
        recipient: PK,
        gateway: PK,
        maxAmountPerPeriod: 1000,
        maxChunkAmount: 100,
        periodLengthSeconds: 86400,
        trackingId: "t",
        cluster: "mainnet",
      };
    case "oneTime":
      return {
        mode: "oneTime",
        tokenMint: PK,
        recipient: PK,
        gateway: PK,
        amount: 500,
        trackingId: "t",
        cluster: "mainnet",
      };
    case "upTo":
      return {
        mode: "upTo",
        tokenMint: PK,
        recipient: PK,
        gateway: PK,
        maxAmount: 800,
        deadline: 1_800_000_000,
        trackingId: "t",
        cluster: "mainnet",
      };
    default:
      throw new Error(`unknown mode ${mode}`);
  }
}
