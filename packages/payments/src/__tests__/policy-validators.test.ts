// Fail-fast per-variant validators mirroring the on-chain rules EXACTLY.
// Feature tributary-uny8 (milestone tributary-f6yh, Axis 6).
//
// Test cases ported from the Rust #[test] blocks in:
//   programs/tributary/src/policies/{subscription,one_time,up_to}.rs
// pay_as_you_go.rs / milestone.rs have no Rust tests — covered by rule specs.

import { TributaryValidationError, ValidationUtils } from "../utils/validation";
import {
  SubscriptionParams,
  MilestoneParams,
  PayAsYouGoParams,
  OneTimePolicyParams,
  UpToParams,
  OneTimeParams,
} from "../core/session";

const PK = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const I64_MAX = "9223372036854775807"; // 2^63 - 1

const sub = (over: Partial<SubscriptionParams> = {}): SubscriptionParams => ({
  mode: "subscription",
  tokenMint: PK,
  recipient: PK,
  gateway: PK,
  amount: 100,
  autoRenew: true,
  maxRenewals: null,
  paymentFrequency: "monthly",
  ...over,
});

const ot = (over: Partial<OneTimePolicyParams> = {}): OneTimePolicyParams => ({
  mode: "oneTime",
  tokenMint: PK,
  recipient: PK,
  gateway: PK,
  amount: 100,
  ...over,
});

const upt = (over: Partial<UpToParams> = {}): UpToParams => ({
  mode: "upTo",
  tokenMint: PK,
  recipient: PK,
  gateway: PK,
  maxAmount: 100,
  deadline: 1_800_000_000,
  ...over,
});

const payg = (over: Partial<PayAsYouGoParams> = {}): PayAsYouGoParams => ({
  mode: "payAsYouGo",
  tokenMint: PK,
  recipient: PK,
  gateway: PK,
  maxAmountPerPeriod: 1000,
  maxChunkAmount: 100,
  periodLengthSeconds: 86400,
  ...over,
});

const mile = (over: Partial<MilestoneParams> = {}): MilestoneParams => ({
  mode: "milestone",
  tokenMint: PK,
  recipient: PK,
  gateway: PK,
  milestoneAmounts: [100, 200],
  milestoneTimestamps: [1_700_000_000, 1_710_000_000],
  releaseCondition: 0b0001,
  totalMilestones: 2,
  ...over,
});

const pay = (over: Partial<OneTimeParams> = {}): OneTimeParams => ({
  mode: "payment",
  tokenMint: PK,
  recipient: PK,
  amount: 100,
  ...over,
});

describe("TributaryValidationError", () => {
  it("carries variant + field + constraint", () => {
    try {
      ValidationUtils.validatePolicyConfig(sub({ amount: 0 }));
      fail("expected throw");
    } catch (e) {
      const err = e as TributaryValidationError;
      expect(err).toBeInstanceOf(TributaryValidationError);
      expect(err.variant).toBe("subscription");
      expect(err.field).toBe("amount");
      expect(err.constraint).toMatch(/> 0/);
      expect(err.message).toMatch(/amount/);
    }
  });
});

// --- subscription (ports programs/tributary/src/policies/subscription.rs) ---
describe("validateSubscriptionConfig", () => {
  it("accepts a valid subscription", () => {
    expect(() => ValidationUtils.validatePolicyConfig(sub())).not.toThrow();
  });

  it("rejects zero amount", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(sub({ amount: 0 }))
    ).toThrow(/amount/);
  });

  it("custom frequency rejects zero (custom_frequency_rejects_zero)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(
        sub({ paymentFrequency: "custom:0" })
      )
    ).toThrow(/frequenc/i);
  });

  it("custom frequency rejects huge interval (custom_frequency_rejects_u64_max)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(
        sub({ paymentFrequency: `custom:${I64_MAX}0` })
      )
    ).toThrow(/frequenc/i);
  });

  it("custom frequency accepts valid interval (custom_frequency_accepts_valid_interval)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(
        sub({ paymentFrequency: "custom:86400" })
      )
    ).not.toThrow();
  });

  it("predefined frequency skips interval check (predefined_frequency_skips_interval_check)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(sub({ paymentFrequency: "monthly" }))
    ).not.toThrow();
  });

  it("rejects maxRenewals of 0 when set", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(sub({ maxRenewals: 0 }))
    ).toThrow(/renewal/i);
  });
});

// --- oneTime (ports programs/tributary/src/policies/one_time.rs) ---
describe("validateOneTimeConfig", () => {
  it("rejects zero amount (rejects_zero_amount)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(ot({ amount: 0 }))
    ).toThrow(/amount/);
  });

  it("accepts immediate no expiry (accepts_immediate_no_expiry)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(ot({ amount: 100 }))
    ).not.toThrow();
    expect(() =>
      ValidationUtils.validatePolicyConfig(ot({ amount: 100, dueDate: -1 }))
    ).not.toThrow();
  });

  it("accepts future due no expiry (accepts_future_due_no_expiry)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(
        ot({ amount: 100, dueDate: 1_700_000_000 })
      )
    ).not.toThrow();
  });

  it("rejects expiry before due (rejects_expiry_before_due)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(
        ot({ amount: 100, dueDate: 1_700_000_000, expiryDate: 1_600_000_000 })
      )
    ).toThrow(/expir|due/i);
  });

  it("accepts expiry after due (accepts_expiry_after_due)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(
        ot({ amount: 100, dueDate: 1_700_000_000, expiryDate: 1_800_000_000 })
      )
    ).not.toThrow();
  });

  it("skips expiry check when due immediate (skips_expiry_check_when_due_immediate)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(
        ot({ amount: 100, dueDate: 0, expiryDate: 1 })
      )
    ).not.toThrow();
  });
});

// --- upTo (ports programs/tributary/src/policies/up_to.rs) ---
describe("validateUpToConfig", () => {
  it("rejects zero max amount (rejects_zero_max_amount)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(upt({ maxAmount: 0 }))
    ).toThrow(/amount/i);
  });

  it("rejects zero deadline (rejects_zero_deadline)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(upt({ deadline: 0 }))
    ).toThrow(/deadline/i);
  });

  it("rejects negative deadline (rejects_negative_deadline)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(upt({ deadline: -1 }))
    ).toThrow(/deadline/i);
  });

  it("accepts immediate validAfter (accepts_immediate_valid_after)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(upt({ validAfter: 0 }))
    ).not.toThrow();
    expect(() =>
      ValidationUtils.validatePolicyConfig(upt({ validAfter: -1 }))
    ).not.toThrow();
  });

  it("accepts future validAfter with later deadline (accepts_future_valid_after_with_later_deadline)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(
        upt({ validAfter: 1_700_000_000, deadline: 1_800_000_000 })
      )
    ).not.toThrow();
  });

  it("rejects deadline before validAfter (rejects_deadline_before_valid_after)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(
        upt({ validAfter: 1_800_000_000, deadline: 1_700_000_000 })
      )
    ).toThrow(/deadline|validAfter|window/i);
  });

  it("rejects deadline equal validAfter (rejects_deadline_equal_valid_after)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(
        upt({ validAfter: 1_700_000_000, deadline: 1_700_000_000 })
      )
    ).toThrow(/deadline|validAfter|window/i);
  });
});

// --- payAsYouGo (no Rust tests; rules from pay_as_you_go.rs) ---
describe("validatePayAsYouGoConfig", () => {
  it("accepts valid payg", () => {
    expect(() => ValidationUtils.validatePolicyConfig(payg())).not.toThrow();
  });

  it("rejects zero maxAmountPerPeriod", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(payg({ maxAmountPerPeriod: 0 }))
    ).toThrow(/maxAmountPerPeriod|amount/i);
  });

  it("rejects zero maxChunkAmount", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(payg({ maxChunkAmount: 0 }))
    ).toThrow(/chunk/i);
  });

  it("rejects maxChunkAmount > maxAmountPerPeriod", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(
        payg({ maxAmountPerPeriod: 100, maxChunkAmount: 101 })
      )
    ).toThrow(/chunk|period/i);
  });

  it("accepts maxChunkAmount == maxAmountPerPeriod (boundary)", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(
        payg({ maxAmountPerPeriod: 100, maxChunkAmount: 100 })
      )
    ).not.toThrow();
  });

  it("rejects zero periodLengthSeconds", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(payg({ periodLengthSeconds: 0 }))
    ).toThrow(/period/i);
  });
});

// --- milestone (no Rust tests; rules from milestone.rs) ---
describe("validateMilestoneConfig", () => {
  it("accepts valid milestone", () => {
    expect(() => ValidationUtils.validatePolicyConfig(mile())).not.toThrow();
  });

  it("rejects totalMilestones < 1", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(mile({ totalMilestones: 0 }))
    ).toThrow(/totalMilestones/i);
  });

  it("rejects totalMilestones > 4", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(mile({ totalMilestones: 5 }))
    ).toThrow(/totalMilestones/i);
  });

  it("rejects a zero milestone amount", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(
        mile({ milestoneAmounts: [0, 200], totalMilestones: 2 })
      )
    ).toThrow(/amount/i);
  });

  it("rejects multiple signer bits set in releaseCondition", () => {
    // bits 1 (GATEWAY) + 2 (OWNER) both set = 0b0110 -> mutually exclusive violation
    expect(() =>
      ValidationUtils.validatePolicyConfig(mile({ releaseCondition: 0b0110 }))
    ).toThrow(/release|signer|exclusive/i);
  });

  it("accepts a single signer bit (GATEWAY) + due-date bit", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(mile({ releaseCondition: 0b0011 }))
    ).not.toThrow();
  });
});

// --- payment (direct transfer; no on-chain validator) ---
describe("validatePaymentConfig", () => {
  it("accepts valid payment", () => {
    expect(() => ValidationUtils.validatePolicyConfig(pay())).not.toThrow();
  });

  it("rejects zero amount", () => {
    expect(() =>
      ValidationUtils.validatePolicyConfig(pay({ amount: 0 }))
    ).toThrow(/amount/);
  });
});

// --- dispatcher ---
describe("validatePolicyConfig dispatcher", () => {
  it.each([
    "subscription",
    "milestone",
    "payAsYouGo",
    "oneTime",
    "upTo",
    "payment",
  ] as const)("routes %s to its validator", (mode) => {
    const params: any = {
      subscription: sub(),
      milestone: mile(),
      payAsYouGo: payg(),
      oneTime: ot(),
      upTo: upt(),
      payment: pay(),
    }[mode];
    expect(() => ValidationUtils.validatePolicyConfig(params)).not.toThrow();
  });
});
