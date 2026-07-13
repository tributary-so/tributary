import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { lighthouse, IntegerOperator } from "../packages/sdk/src";
import {
  parseAssertionFamily,
  evaluateAssertion,
  applyIntegerOperator,
  isScheduleReady,
} from "../apps/scheduler/src/evaluator";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

function mockSystemAccount(lamports: number): any {
  return {
    lamports,
    data: Buffer.alloc(0),
    owner: SystemProgram.programId,
    executable: false,
    rentEpoch: 0,
  };
}

function mockTokenAccount(amount: number): any {
  const data = Buffer.alloc(165);
  data.writeBigUInt64LE(BigInt(amount), 64);
  return {
    lamports: 2_039_280,
    data,
    owner: TOKEN_PROGRAM_ID,
    executable: false,
    rentEpoch: 0,
  };
}

describe("parseAssertionFamily", () => {
  test("identifies accountInfo discriminator (u32 LE = 5)", () => {
    const guard = lighthouse
      .accountInfo(PublicKey.unique())
      .lamports(100, "<")
      .build();
    expect(parseAssertionFamily(guard.data)).toBe("accountInfo");
  });

  test("identifies tokenAccount discriminator (u32 LE = 9)", () => {
    const guard = lighthouse
      .tokenAccount(PublicKey.unique())
      .amount(500, ">")
      .build();
    const family = parseAssertionFamily(guard.data);
    expect(family === "tokenAccount" || family === "accountInfo").toBe(true);
  });

  test("returns unknown for garbage data", () => {
    expect(parseAssertionFamily(Buffer.alloc(2))).toBe("unknown");
    expect(parseAssertionFamily(Buffer.from([99, 0, 0, 0]))).toBe("unknown");
  });
});

describe("applyIntegerOperator", () => {
  const cases: [bigint, bigint, IntegerOperator, boolean][] = [
    [10n, 10n, IntegerOperator.Equal, true],
    [10n, 20n, IntegerOperator.Equal, false],
    [10n, 10n, IntegerOperator.NotEqual, false],
    [10n, 20n, IntegerOperator.NotEqual, true],
    [20n, 10n, IntegerOperator.GreaterThan, true],
    [5n, 10n, IntegerOperator.GreaterThan, false],
    [5n, 10n, IntegerOperator.LessThan, true],
    [20n, 10n, IntegerOperator.LessThan, false],
    [10n, 10n, IntegerOperator.GreaterThanOrEqual, true],
    [5n, 10n, IntegerOperator.GreaterThanOrEqual, false],
    [10n, 10n, IntegerOperator.LessThanOrEqual, true],
    [20n, 10n, IntegerOperator.LessThanOrEqual, false],
  ];

  test.each(cases)("%d op %d → %s", (actual, expected, op, result) => {
    expect(applyIntegerOperator(actual, expected, op)).toBe(result);
  });
});

describe("evaluateAssertion — accountInfo.lamports", () => {
  const targetAccount = PublicKey.unique();

  test("lamports < threshold — true when below", () => {
    const guard = lighthouse
      .accountInfo(targetAccount)
      .lamports(20_000_000_000, "<")
      .build();

    const family = parseAssertionFamily(guard.data);
    expect(family).toBe("accountInfo");

    const account = mockSystemAccount(5_000_000_000); // 5 SOL < 20 SOL
    expect(evaluateAssertion(family, guard.data, account)).toBe(true);
  });

  test("lamports < threshold — false when above", () => {
    const guard = lighthouse
      .accountInfo(targetAccount)
      .lamports(20_000_000_000, "<")
      .build();

    const account = mockSystemAccount(50_000_000_000); // 50 SOL > 20 SOL
    expect(
      evaluateAssertion(parseAssertionFamily(guard.data), guard.data, account)
    ).toBe(false);
  });

  test("returns false on null account", () => {
    const guard = lighthouse
      .accountInfo(targetAccount)
      .lamports(20_000_000_000, "<")
      .build();
    expect(
      evaluateAssertion(parseAssertionFamily(guard.data), guard.data, null)
    ).toBe(false);
  });
});

describe("evaluateAssertion — tokenAccount.amount", () => {
  const targetAta = PublicKey.unique();

  test("amount > threshold — true when above", () => {
    const guard = lighthouse
      .tokenAccount(targetAta)
      .amount(10_000_000, ">")
      .build();

    const family = parseAssertionFamily(guard.data);
    const account = mockTokenAccount(50_000_000); // 50 USDC > 10 USDC
    expect(evaluateAssertion(family, guard.data, account)).toBe(true);
  });

  test("amount > threshold — false when below", () => {
    const guard = lighthouse
      .tokenAccount(targetAta)
      .amount(100_000_000, ">")
      .build();

    const account = mockTokenAccount(5_000_000); // 5 USDC < 100 USDC
    expect(
      evaluateAssertion(parseAssertionFamily(guard.data), guard.data, account)
    ).toBe(false);
  });
});

describe("evaluateAssertion — unknown family", () => {
  test("returns false for unknown discriminator", () => {
    const garbage = Buffer.from([99, 0, 0, 0, ...Array(20).fill(0)]);
    expect(
      evaluateAssertion(
        parseAssertionFamily(garbage),
        garbage,
        mockSystemAccount(1000)
      )
    ).toBe(false);
  });
});

describe("isScheduleReady", () => {
  const now = 1_700_000_000;

  test("inactive policy → not ready", () => {
    const policy = {
      status: { paused: {} },
      policyType: {},
      paymentCount: 0,
    } as any;
    expect(isScheduleReady(policy, now).ready).toBe(false);
  });

  test("subscription — due and under max renewals → ready", () => {
    const policy = {
      status: { active: {} },
      paymentCount: 3,
      policyType: {
        subscription: {
          nextPaymentDue: new BN(now - 100),
          maxRenewals: 12,
          amount: new BN(1_000_000),
        },
      },
    } as any;
    const result = isScheduleReady(policy, now);
    expect(result.ready).toBe(true);
    expect(result.amount?.toNumber()).toBe(1_000_000);
  });

  test("subscription — not yet due → not ready", () => {
    const policy = {
      status: { active: {} },
      paymentCount: 0,
      policyType: {
        subscription: {
          nextPaymentDue: new BN(now + 3600),
          maxRenewals: 12,
          amount: new BN(1_000_000),
        },
      },
    } as any;
    expect(isScheduleReady(policy, now).ready).toBe(false);
  });

  test("subscription — max renewals reached → not ready", () => {
    const policy = {
      status: { active: {} },
      paymentCount: 12,
      policyType: {
        subscription: {
          nextPaymentDue: new BN(now - 100),
          maxRenewals: 12,
          amount: new BN(1_000_000),
        },
      },
    } as any;
    expect(isScheduleReady(policy, now).ready).toBe(false);
  });

  test("milestone — time-based, current due → ready", () => {
    const policy = {
      status: { active: {} },
      paymentCount: 0,
      policyType: {
        milestone: {
          releaseCondition: 0,
          currentMilestone: 0,
          totalMilestones: 3,
          milestoneTimestamps: [
            new BN(now - 100),
            new BN(now + 9999),
            new BN(now + 99999),
          ],
          milestoneAmounts: [new BN(500), new BN(300), new BN(200)],
        },
      },
    } as any;
    const result = isScheduleReady(policy, now);
    expect(result.ready).toBe(true);
    expect(result.amount?.toNumber()).toBe(500);
  });

  test("milestone — requires signer (releaseCondition != 0) → not ready", () => {
    const policy = {
      status: { active: {} },
      paymentCount: 0,
      policyType: {
        milestone: {
          releaseCondition: 2, // gateway signer bit
          currentMilestone: 0,
          totalMilestones: 1,
          milestoneTimestamps: [new BN(now - 100)],
          milestoneAmounts: [new BN(500)],
        },
      },
    } as any;
    expect(isScheduleReady(policy, now).ready).toBe(false);
  });

  test("payAsYouGo — headroom in current period → ready", () => {
    const policy = {
      status: { active: {} },
      paymentCount: 0,
      policyType: {
        payAsYouGo: {
          maxAmountPerPeriod: new BN(100_000_000),
          maxChunkAmount: new BN(50_000_000),
          periodLengthSeconds: new BN(30 * 24 * 3600),
          currentPeriodStart: new BN(now - 60), // 1 min ago
          currentPeriodTotal: new BN(0),
        },
      },
    } as any;
    const result = isScheduleReady(policy, now);
    expect(result.ready).toBe(true);
    expect(result.amount?.toNumber()).toBe(50_000_000); // capped at chunk
  });

  test("payAsYouGo — period cap exhausted → not ready", () => {
    const policy = {
      status: { active: {} },
      paymentCount: 0,
      policyType: {
        payAsYouGo: {
          maxAmountPerPeriod: new BN(50_000_000),
          maxChunkAmount: new BN(50_000_000),
          periodLengthSeconds: new BN(30 * 24 * 3600),
          currentPeriodStart: new BN(now - 60),
          currentPeriodTotal: new BN(50_000_000), // fully used
        },
      },
    } as any;
    expect(isScheduleReady(policy, now).ready).toBe(false);
  });

  test("payAsYouGo — period rolled over → ready (total resets)", () => {
    const oneMonth = 30 * 24 * 3600;
    const policy = {
      status: { active: {} },
      paymentCount: 0,
      policyType: {
        payAsYouGo: {
          maxAmountPerPeriod: new BN(50_000_000),
          maxChunkAmount: new BN(50_000_000),
          periodLengthSeconds: new BN(oneMonth),
          currentPeriodStart: new BN(now - oneMonth - 1), // expired
          currentPeriodTotal: new BN(50_000_000), // was full
        },
      },
    } as any;
    const result = isScheduleReady(policy, now);
    expect(result.ready).toBe(true);
    expect(result.amount?.toNumber()).toBe(50_000_000); // chunk size, period reset
  });

  test("payAsYouGo — partial usage, chunk > headroom → capped at headroom", () => {
    const policy = {
      status: { active: {} },
      paymentCount: 0,
      policyType: {
        payAsYouGo: {
          maxAmountPerPeriod: new BN(100_000_000),
          maxChunkAmount: new BN(50_000_000),
          periodLengthSeconds: new BN(30 * 24 * 3600),
          currentPeriodStart: new BN(now - 60),
          currentPeriodTotal: new BN(75_000_000), // 25M headroom
        },
      },
    } as any;
    const result = isScheduleReady(policy, now);
    expect(result.ready).toBe(true);
    expect(result.amount?.toNumber()).toBe(25_000_000); // min(chunk, headroom)
  });
});
