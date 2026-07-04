// Canonical validation fixtures for the cross-package parity contract.
//
// Each case is a CheckoutParams arm plus, for invalid cases, the constraint
// substring the TS validator must surface. The TS parity test
// (../parity.test.ts) runs every case through ValidationUtils and asserts the
// validators agree.
//
// The Rust side of the parity contract lives in the per-variant #[test]
// blocks of programs/tributary/src/policies/{subscription,milestone,
// pay_as_you_go,one_time,up_to}.rs. Those tests are the source of truth for
// the on-chain behaviour; every case here MUST mirror a Rust case so that
// drift between the TS encoder-validators and the on-chain validators is
// caught by CI on either side.
//
// --- workflow: add a new case ---
// 1. Add the case to the relevant variant below (valid or invalid).
// 2. Add the SAME case to the Rust validator's #[test] block. The names
//    should match (snake_case in Rust, camelCase here) so grepping cross-
//    references them.
// 3. Run `pnpm --filter @tributary-so/payments test src/__tests__/parity.test.ts`
//    and `cargo test -p tributary` — both must be green.

import type { CheckoutParams } from "../../core/session";

const PK = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

export interface FixtureCase {
  /** camelCase mirror of the Rust #[test] name (or rule short-description). */
  name: string;
  params: CheckoutParams;
  /** Present on invalid cases: substring matched against
   *  TributaryValidationError.constraint (case-insensitive). */
  expectConstraint?: string;
}

export interface VariantFixtures {
  valid: FixtureCase[];
  invalid: FixtureCase[];
}

// ---- builders (keep each case minimal + readable) ---------------------------

const sub = (over: Partial<any>): CheckoutParams => ({
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

const mile = (over: Partial<any>): CheckoutParams => ({
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

const payg = (over: Partial<any>): CheckoutParams => ({
  mode: "payAsYouGo",
  tokenMint: PK,
  recipient: PK,
  gateway: PK,
  maxAmountPerPeriod: 1000,
  maxChunkAmount: 100,
  periodLengthSeconds: 86400,
  ...over,
});

const ot = (over: Partial<any>): CheckoutParams => ({
  mode: "oneTime",
  tokenMint: PK,
  recipient: PK,
  gateway: PK,
  amount: 100,
  ...over,
});

const upt = (over: Partial<any>): CheckoutParams => ({
  mode: "upTo",
  tokenMint: PK,
  recipient: PK,
  gateway: PK,
  maxAmount: 100,
  deadline: 1_800_000_000,
  ...over,
});

const pay = (over: Partial<any>): CheckoutParams => ({
  mode: "payment",
  tokenMint: PK,
  recipient: PK,
  amount: 100,
  ...over,
});

export const POLICY_FIXTURES: Record<
  "subscription" | "milestone" | "payAsYouGo" | "oneTime" | "upTo" | "payment",
  VariantFixtures
> = {
  subscription: {
    valid: [
      {
        name: "predefinedFrequencySkipsIntervalCheck",
        params: sub({ paymentFrequency: "monthly" }),
      },
      {
        name: "customFrequencyAcceptsValidInterval",
        params: sub({ paymentFrequency: "custom:86400" }),
      },
    ],
    invalid: [
      {
        name: "rejectsZeroAmount",
        params: sub({ amount: 0 }),
        expectConstraint: "amount must be > 0",
      },
      {
        name: "customFrequencyRejectsZero",
        params: sub({ paymentFrequency: "custom:0" }),
        expectConstraint: "custom interval must be > 0",
      },
      {
        name: "customFrequencyRejectsHugeInterval",
        params: sub({ paymentFrequency: "custom:99999999999999999999" }),
        expectConstraint: "i64::MAX",
      },
      {
        name: "rejectsMaxRenewalsZero",
        params: sub({ maxRenewals: 0 }),
        expectConstraint: "maxRenewals must be > 0",
      },
    ],
  },

  milestone: {
    valid: [
      { name: "acceptsTwoMilestones", params: mile({}) },
      {
        name: "acceptsFourMilestones",
        params: mile({
          milestoneAmounts: [1, 2, 3, 4],
          totalMilestones: 4,
          milestoneTimestamps: [
            1_700_000_000, 1_710_000_000, 1_720_000_000, 1_730_000_000,
          ],
        }),
      },
      {
        name: "acceptsGatewaySignerWithDueDate",
        params: mile({ releaseCondition: 0b0011 }),
      },
      {
        name: "acceptsNoRestrictions",
        params: mile({ releaseCondition: 0b0000 }),
      },
    ],
    invalid: [
      {
        name: "rejectsTotalMilestonesZero",
        params: mile({ totalMilestones: 0 }),
        expectConstraint: "1..=4",
      },
      {
        name: "rejectsTotalMilestonesFive",
        params: mile({ totalMilestones: 5 }),
        expectConstraint: "1..=4",
      },
      {
        name: "rejectsZeroMilestoneAmount",
        params: mile({ milestoneAmounts: [0, 200] }),
        expectConstraint: "milestone amount",
      },
      {
        name: "rejectsMultipleSignerBits",
        params: mile({ releaseCondition: 0b0110 }),
        expectConstraint: "mutually exclusive",
      },
    ],
  },

  payAsYouGo: {
    valid: [
      {
        name: "acceptsValidPayg",
        params: payg({
          maxAmountPerPeriod: 1000,
          maxChunkAmount: 100,
          periodLengthSeconds: 86400,
        }),
      },
      {
        name: "acceptsChunkEqualToPeriodCap",
        params: payg({
          maxAmountPerPeriod: 100,
          maxChunkAmount: 100,
          periodLengthSeconds: 86400,
        }),
      },
    ],
    invalid: [
      {
        name: "rejectsZeroPeriodCap",
        params: payg({
          maxAmountPerPeriod: 0,
          maxChunkAmount: 1,
          periodLengthSeconds: 60,
        }),
        expectConstraint: "maxAmountPerPeriod",
      },
      {
        name: "rejectsZeroChunk",
        params: payg({
          maxAmountPerPeriod: 1000,
          maxChunkAmount: 0,
          periodLengthSeconds: 60,
        }),
        expectConstraint: "maxChunkAmount",
      },
      {
        name: "rejectsChunkAbovePeriodCap",
        params: payg({
          maxAmountPerPeriod: 100,
          maxChunkAmount: 101,
          periodLengthSeconds: 60,
        }),
        expectConstraint: "<= maxAmountPerPeriod",
      },
      {
        name: "rejectsZeroPeriod",
        params: payg({
          maxAmountPerPeriod: 1000,
          maxChunkAmount: 100,
          periodLengthSeconds: 0,
        }),
        expectConstraint: "periodLengthSeconds",
      },
    ],
  },

  oneTime: {
    valid: [
      { name: "acceptsImmediateNoExpiry", params: ot({}) },
      {
        name: "acceptsFutureDueNoExpiry",
        params: ot({ dueDate: 1_700_000_000 }),
      },
      {
        name: "acceptsExpiryAfterDue",
        params: ot({ dueDate: 1_700_000_000, expiryDate: 1_800_000_000 }),
      },
      {
        name: "skipsExpiryCheckWhenDueImmediate",
        params: ot({ dueDate: 0, expiryDate: 1 }),
      },
    ],
    invalid: [
      {
        name: "rejectsZeroAmount",
        params: ot({ amount: 0 }),
        expectConstraint: "amount must be > 0",
      },
      {
        name: "rejectsExpiryBeforeDue",
        params: ot({ dueDate: 1_700_000_000, expiryDate: 1_600_000_000 }),
        expectConstraint: "expiryDate must be > dueDate",
      },
    ],
  },

  upTo: {
    valid: [
      { name: "acceptsImmediateValidAfter", params: upt({ validAfter: 0 }) },
      {
        name: "acceptsFutureValidAfterLaterDeadline",
        params: upt({ validAfter: 1_700_000_000, deadline: 1_800_000_000 }),
      },
    ],
    invalid: [
      {
        name: "rejectsZeroMaxAmount",
        params: upt({ maxAmount: 0 }),
        expectConstraint: "maxAmount must be > 0",
      },
      {
        name: "rejectsZeroDeadline",
        params: upt({ deadline: 0 }),
        expectConstraint: "deadline must be > 0",
      },
      {
        name: "rejectsNegativeDeadline",
        params: upt({ deadline: -1 }),
        expectConstraint: "deadline must be > 0",
      },
      {
        name: "rejectsDeadlineBeforeValidAfter",
        params: upt({ validAfter: 1_800_000_000, deadline: 1_700_000_000 }),
        expectConstraint: "deadline must be > validAfter",
      },
      {
        name: "rejectsDeadlineEqualValidAfter",
        params: upt({ validAfter: 1_700_000_000, deadline: 1_700_000_000 }),
        expectConstraint: "deadline must be > validAfter",
      },
    ],
  },

  payment: {
    valid: [{ name: "acceptsValidPayment", params: pay({}) }],
    invalid: [
      {
        name: "rejectsZeroAmount",
        params: pay({ amount: 0 }),
        expectConstraint: "amount must be > 0",
      },
    ],
  },
};
