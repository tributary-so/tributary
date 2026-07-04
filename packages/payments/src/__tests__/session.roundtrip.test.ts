// Property-style round-trip tests for the session encoding.
// Feature tributary-dfi4 (milestone tributary-f6yh, testing epic).
//
// The deterministic per-variant round-trips live in session-variants.test.ts
// (feature tributary-nx0s). This file adds a randomized/fuzz dimension: seed
// a deterministic PRNG, generate many valid configs per variant, encode ->
// decode, and assert stable identity + correct path. Catches field-spacing
// and normalization regressions the hand-written fixtures might miss.

import {
  CheckoutSessionManager,
  CheckoutParams,
  SessionMode,
} from "../core/session";

const PK = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const manager = new CheckoutSessionManager();

// Deterministic PRNG (mulberry32) so failures are reproducible.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const intIn = (r: () => number, lo: number, hi: number) =>
  Math.floor(r() * (hi - lo + 1)) + lo;

function randomSubscription(r: () => number): CheckoutParams {
  return {
    mode: "subscription",
    tokenMint: PK,
    recipient: PK,
    gateway: PK,
    amount: intIn(r, 1, 1_000_000),
    autoRenew: r() > 0.5,
    maxRenewals: r() > 0.5 ? intIn(r, 1, 12) : null,
    paymentFrequency: ["daily", "weekly", "monthly", "annually"][
      intIn(r, 0, 3)
    ],
    startTime: null,
    trackingId: `t${intIn(r, 0, 9999)}`,
    lineItems: [],
    cluster: "mainnet",
  };
}

function randomMilestone(r: () => number): CheckoutParams {
  const total = intIn(r, 1, 4);
  const base = 1_700_000_000;
  const amounts: Array<number | string> = [];
  const timestamps: number[] = [];
  for (let i = 0; i < total; i++) {
    amounts.push(intIn(r, 1, 10_000));
    timestamps.push(base + i * intIn(r, 100, 1000));
  }
  return {
    mode: "milestone",
    tokenMint: PK,
    recipient: PK,
    gateway: PK,
    milestoneAmounts: amounts,
    milestoneTimestamps: timestamps,
    releaseCondition: [0b0000, 0b0001, 0b0010, 0b0100, 0b1000, 0b0011][
      intIn(r, 0, 5)
    ],
    totalMilestones: total,
    trackingId: `t${intIn(r, 0, 9999)}`,
    cluster: "mainnet",
  };
}

function randomPayAsYouGo(r: () => number): CheckoutParams {
  const cap = intIn(r, 100, 10_000);
  return {
    mode: "payAsYouGo",
    tokenMint: PK,
    recipient: PK,
    gateway: PK,
    maxAmountPerPeriod: cap,
    maxChunkAmount: intIn(r, 1, cap),
    periodLengthSeconds: intIn(r, 60, 86400),
    trackingId: `t${intIn(r, 0, 9999)}`,
    cluster: "mainnet",
  };
}

function randomOneTime(r: () => number): CheckoutParams {
  const due = r() > 0.5 ? intIn(r, 1_700_000_000, 1_800_000_000) : 0;
  return {
    mode: "oneTime",
    tokenMint: PK,
    recipient: PK,
    gateway: PK,
    amount: intIn(r, 1, 100_000),
    dueDate: due || undefined,
    expiryDate: due ? intIn(r, due + 1, 2_000_000_000) : undefined,
    trackingId: `t${intIn(r, 0, 9999)}`,
    cluster: "mainnet",
  };
}

function randomUpTo(r: () => number): CheckoutParams {
  const va = r() > 0.5 ? intIn(r, 1_700_000_000, 1_800_000_000) : 0;
  return {
    mode: "upTo",
    tokenMint: PK,
    recipient: PK,
    gateway: PK,
    maxAmount: intIn(r, 1, 100_000),
    validAfter: va || undefined,
    deadline: intIn(r, Math.max(va + 1, 1_800_000_000), 2_000_000_000),
    trackingId: `t${intIn(r, 0, 9999)}`,
    cluster: "mainnet",
  };
}

function randomPayment(r: () => number): CheckoutParams {
  return {
    mode: "payment",
    tokenMint: PK,
    recipient: PK,
    amount: intIn(r, 1, 100_000),
    trackingId: `t${intIn(r, 0, 9999)}`,
    cluster: "mainnet",
  };
}

const GENERATORS: Record<SessionMode, (r: () => number) => CheckoutParams> = {
  subscription: randomSubscription,
  milestone: randomMilestone,
  payAsYouGo: randomPayAsYouGo,
  oneTime: randomOneTime,
  upTo: randomUpTo,
  payment: randomPayment,
};

const PATH_FOR: Record<SessionMode, RegExp> = {
  subscription: /\/subscribe\//,
  payment: /\/pay\//,
  milestone: /\/policy\//,
  payAsYouGo: /\/policy\//,
  oneTime: /\/policy\//,
  upTo: /\/policy\//,
};

const ITERATIONS = 25;
const SEED = 0xf6_70_5e; // stable seed ("f6yh" mnemonic-ish)

describe("session encoding — randomized round-trip (property)", () => {
  const modes: SessionMode[] = [
    "subscription",
    "milestone",
    "payAsYouGo",
    "oneTime",
    "upTo",
    "payment",
  ];

  it.each(modes)("round-trips 25 random %s configs stably", (mode) => {
    const r = rng(SEED + mode.length);
    for (let i = 0; i < ITERATIONS; i++) {
      const original = GENERATORS[mode](r);
      const url = manager.encodeUrl(original);
      // Path correctness on every iteration, not just round-trip equality.
      expect(url).toMatch(PATH_FOR[mode]);
      const blob = url.split("/").pop() as string;
      const decoded = manager.decodeUrl(blob);
      expect(decoded).toEqual(original);
    }
  });

  it("encode is a pure function of its input (same config -> same blob)", () => {
    const r = rng(424242);
    const cfg = randomMilestone(r);
    const b1 = manager.encodeUrl(cfg).split("/").pop();
    const b2 = manager.encodeUrl(cfg).split("/").pop();
    expect(b1).toBe(b2);
  });

  it("cluster defaults to mainnet when omitted (subscription)", () => {
    const r = rng(7);
    const { cluster: _omit, ...withoutCluster } = randomSubscription(r) as any;
    const decoded: any = manager.decodeUrl(
      manager.encodeUrl(withoutCluster).split("/").pop() as string
    );
    expect(decoded.cluster).toBe("mainnet");
  });
});
