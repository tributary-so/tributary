/**
 * Unit tests for the SDK composable-execution primitives
 * (packages/sdk/src/composable.ts — ADR-0030).
 *
 * These are pure / mocked-Connection tests. The end-to-end composable
 * execution suite lives in tests/composable.test.ts (Surfpool integration).
 */
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import BN from "bn.js";
import {
  isForwardEnabled,
  grossCapToFace,
  resolveDefaultForwardAmount,
  resolveValidationTargets,
  assembleComposableRemainingAccounts,
  deriveSchedulerAta,
} from "../packages/sdk/src/composable";
import type { ComposablePolicy, PaymentGateway } from "../packages/sdk/src";

// ── fixture builders ──────────────────────────────────────────────────

const DEFAULT_PUBKEY = PublicKey.default;
const CONCRETE_PUBKEY = new PublicKey(
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
);

function paygPolicy(
  overrides: Partial<{
    maxChunkAmount: BN;
    maxAmountPerPeriod: BN;
    currentPeriodTotal: BN;
    programId: PublicKey;
  }> = {}
): ComposablePolicy {
  const maxChunkAmount = overrides.maxChunkAmount ?? new BN(1_000_000);
  return {
    bump: 1,
    userPayment: PublicKey.unique(),
    gateway: PublicKey.unique(),
    status: { active: {} },
    rentPayer: PublicKey.unique(),
    policyType: {
      payAsYouGo: {
        maxAmountPerPeriod: overrides.maxAmountPerPeriod ?? new BN(10_000_000),
        maxChunkAmount,
        periodLengthSeconds: new BN(86400),
        currentPeriodStart: new BN(0),
        currentPeriodTotal: overrides.currentPeriodTotal ?? new BN(0),
        expiryDate: null,
        padding: Array(79).fill(0),
      },
    },
    forwardConfig: {
      instructionConstraint: {
        programId: overrides.programId ?? CONCRETE_PUBKEY,
        numDataChecks: 0,
        dataChecks: [],
        numPinnedAccounts: 0,
        pinnedAccounts: [],
      },
      inputMint: PublicKey.unique(),
      outputMint: PublicKey.unique(),
      forwardFlags: 0,
    },
    preValidation: { disabled: {} },
    postValidation: { disabled: {} },
    memo: Array(32).fill(0),
    recipient: PublicKey.unique(),
    totalInput: new BN(0),
    totalOutput: new BN(0),
    paymentCount: 0,
    policyId: 0,
    createdAt: new BN(0),
    lastExecutedAt: new BN(0),
    executionCount: 0,
  } as unknown as ComposablePolicy;
}

function subscriptionPolicy(): ComposablePolicy {
  return {
    ...paygPolicy(),
    policyType: {
      subscription: {
        amount: new BN(500_000),
        autoRenew: true,
        maxRenewals: 12,
        paymentFrequency: { monthly: {} },
        nextPaymentDue: new BN(0),
        padding: Array(97).fill(0),
      },
    },
  } as unknown as ComposablePolicy;
}

function upToPolicy(): ComposablePolicy {
  return {
    ...paygPolicy(),
    policyType: {
      upTo: {
        maxAmount: new BN(1_000_000),
        validAfter: new BN(0),
        deadline: new BN(9999999999),
        padding: Array(104).fill(0),
      },
    },
  } as unknown as ComposablePolicy;
}

function gateway(feeBps: number): PaymentGateway {
  return {
    authority: PublicKey.unique(),
    feeRecipient: PublicKey.unique(),
    gatewayFeeBps: feeBps,
    schedulerShareBps: 0,
    referralAllocationBps: 0,
    featureFlags: 0,
    bump: 1,
  } as unknown as PaymentGateway;
}

/**
 * Build a raw ValidationPda buffer matching the on-chain layout
 * (see VALIDATION_PDA_LAYOUT in types.ts).
 */
function buildValidationPda(
  pinned: PublicKey[],
  data: Buffer = Buffer.alloc(0)
): Buffer {
  const headerLen = 8 + 1 + 1 + 32 * 2 + 2; // 76
  const buf = Buffer.alloc(headerLen + data.length);
  // discriminator (8 bytes) — arbitrary, parseValidationPda skips it
  buf.writeUInt8(1, 8); // bump
  buf.writeUInt8(pinned.length, 9); // numPinnedAccounts
  pinned.forEach((pk, i) => {
    pk.toBuffer().copy(buf, 10 + i * 32);
  });
  buf.writeUInt16LE(data.length, headerLen - 2); // dataLen
  data.copy(buf, headerLen);
  return buf;
}

function mockConnection(accounts: Map<string, { data: Buffer } | null>): any {
  return {
    getAccountInfo: async (pk: PublicKey) => {
      return accounts.get(pk.toBase58()) ?? null;
    },
  };
}

const PROGRAM_ID = new PublicKey("TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ");

// ── isForwardEnabled ──────────────────────────────────────────────────

describe("isForwardEnabled", () => {
  test("sentinel programId → false", () => {
    const policy = paygPolicy({ programId: DEFAULT_PUBKEY });
    expect(isForwardEnabled(policy)).toBe(false);
  });

  test("concrete programId → true", () => {
    const policy = paygPolicy({ programId: CONCRETE_PUBKEY });
    expect(isForwardEnabled(policy)).toBe(true);
  });
});

// ── grossCapToFace ────────────────────────────────────────────────────

describe("grossCapToFace", () => {
  test("zero fee → identity", () => {
    expect(grossCapToFace(new BN(1_000_000), 0).eq(new BN(1_000_000))).toBe(
      true
    );
  });

  test("negative fee → identity", () => {
    expect(grossCapToFace(new BN(1_000_000), -5).eq(new BN(1_000_000))).toBe(
      true
    );
  });

  test("positive fee → floor division", () => {
    // 1_000_000 * 10000 / 10100 = 990099.0099... → 990099
    expect(grossCapToFace(new BN(1_000_000), 100).toString()).toBe("990099");
  });

  test("feeBps=10000 (100%) → half", () => {
    expect(grossCapToFace(new BN(1_000_000), 10_000).toString()).toBe("500000");
  });

  test("grossCap=1, feeBps=100 → floors to 0", () => {
    // 1 * 10000 / 10100 = 0
    expect(grossCapToFace(new BN(1), 100).toString()).toBe("0");
  });
});

// ── resolveDefaultForwardAmount ───────────────────────────────────────

describe("resolveDefaultForwardAmount", () => {
  test("PayAsYouGo with fee → face adjusted", () => {
    const policy = paygPolicy({ maxChunkAmount: new BN(1_000_000) });
    const result = resolveDefaultForwardAmount(policy, gateway(100));
    // 1_000_000 * 10000 / 10100 = 990099
    expect(result?.toString()).toBe("990099");
  });

  test("PayAsYouGo no fee → raw maxChunk", () => {
    const policy = paygPolicy({ maxChunkAmount: new BN(1_000_000) });
    const result = resolveDefaultForwardAmount(policy, gateway(0));
    expect(result?.toString()).toBe("1000000");
  });

  test("PayAsYouGo capped by remainingPeriod", () => {
    const policy = paygPolicy({
      maxChunkAmount: new BN(1_000_000),
      maxAmountPerPeriod: new BN(500_000),
      currentPeriodTotal: new BN(400_000),
    });
    // remainingPeriod = 100_000 < face(1_000_000 with fee=0) → 100_000
    const result = resolveDefaultForwardAmount(policy, gateway(0));
    expect(result?.toString()).toBe("100000");
  });

  test("subscription → null", () => {
    expect(
      resolveDefaultForwardAmount(subscriptionPolicy(), gateway(100))
    ).toBeNull();
  });

  test("UpTo → null", () => {
    expect(resolveDefaultForwardAmount(upToPolicy(), gateway(100))).toBeNull();
  });
});

// ── resolveValidationTargets ──────────────────────────────────────────

describe("resolveValidationTargets", () => {
  test("disabled spec → []", async () => {
    const conn = mockConnection(new Map());
    const result = await resolveValidationTargets(
      conn,
      PublicKey.unique(),
      { disabled: {} } as any,
      PROGRAM_ID,
      "pre"
    );
    expect(result).toEqual([]);
  });

  test("ProgramCall with valid Pda → sliced pins", async () => {
    const policyPda = PublicKey.unique();
    const pinned = [PublicKey.unique(), PublicKey.unique()];
    // Derive the pre-validation PDA the same way the function does
    const [valPdaAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("composable_validation_pre"), policyPda.toBuffer()],
      PROGRAM_ID
    );
    const pdaBuf = buildValidationPda(pinned);
    const accounts = new Map<string, { data: Buffer } | null>();
    accounts.set(valPdaAddress.toBase58(), { data: pdaBuf });

    const conn = mockConnection(accounts);
    const result = await resolveValidationTargets(
      conn,
      policyPda,
      { programCall: { programId: CONCRETE_PUBKEY } } as any,
      PROGRAM_ID,
      "pre"
    );
    expect(result.map((k) => k.toBase58())).toEqual(
      pinned.map((k) => k.toBase58())
    );
  });

  test("post phase → uses post-validation Pda", async () => {
    const policyPda = PublicKey.unique();
    const pinned = [PublicKey.unique()];
    const [valPdaAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("composable_validation_post"), policyPda.toBuffer()],
      PROGRAM_ID
    );
    const pdaBuf = buildValidationPda(pinned);
    const accounts = new Map<string, { data: Buffer } | null>();
    accounts.set(valPdaAddress.toBase58(), { data: pdaBuf });

    const conn = mockConnection(accounts);
    const result = await resolveValidationTargets(
      conn,
      policyPda,
      { programCall: { programId: CONCRETE_PUBKEY } } as any,
      PROGRAM_ID,
      "post"
    );
    expect(result).toHaveLength(1);
    expect(result[0].toBase58()).toBe(pinned[0].toBase58());
  });

  test("ProgramCall with missing Pda → []", async () => {
    const conn = mockConnection(new Map());
    const result = await resolveValidationTargets(
      conn,
      PublicKey.unique(),
      { programCall: { programId: CONCRETE_PUBKEY } } as any,
      PROGRAM_ID,
      "pre"
    );
    expect(result).toEqual([]);
  });

  test("numPinnedAccounts < pinnedAccounts.length → sliced", async () => {
    const policyPda = PublicKey.unique();
    const allPinned = [PublicKey.unique(), PublicKey.unique()];
    const [valPdaAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("composable_validation_pre"), policyPda.toBuffer()],
      PROGRAM_ID
    );
    // Build buffer claiming only 1 pinned account even though 2 slots filled
    const buf = Buffer.alloc(76);
    buf.writeUInt8(1, 9); // numPinnedAccounts = 1
    allPinned[0].toBuffer().copy(buf, 10);
    buf.writeUInt16LE(0, 74);

    const accounts = new Map<string, { data: Buffer } | null>();
    accounts.set(valPdaAddress.toBase58(), { data: buf });
    const conn = mockConnection(accounts);

    const result = await resolveValidationTargets(
      conn,
      policyPda,
      { programCall: { programId: CONCRETE_PUBKEY } } as any,
      PROGRAM_ID,
      "pre"
    );
    expect(result).toHaveLength(1);
    expect(result[0].toBase58()).toBe(allPinned[0].toBase58());
  });
});

// ── assembleComposableRemainingAccounts ───────────────────────────────

describe("assembleComposableRemainingAccounts", () => {
  test("correct order: pre, forward, post", () => {
    const pre = [PublicKey.unique(), PublicKey.unique()];
    const fwd = [
      { pubkey: PublicKey.unique(), isWritable: true },
      { pubkey: PublicKey.unique(), isWritable: false },
    ];
    const post = [PublicKey.unique()];

    const result = assembleComposableRemainingAccounts({
      preTargets: pre,
      forwardAccounts: fwd,
      postTargets: post,
    });

    expect(result).toHaveLength(5);
    expect(result[0].pubkey).toBe(pre[0]);
    expect(result[1].pubkey).toBe(pre[1]);
    expect(result[2].pubkey).toBe(fwd[0].pubkey);
    expect(result[3].pubkey).toBe(fwd[1].pubkey);
    expect(result[4].pubkey).toBe(post[0]);
  });

  test("isSigner is always false", () => {
    const result = assembleComposableRemainingAccounts({
      preTargets: [PublicKey.unique()],
      forwardAccounts: [{ pubkey: PublicKey.unique(), isWritable: true }],
      postTargets: [PublicKey.unique()],
    });
    expect(result.every((m) => m.isSigner === false)).toBe(true);
  });

  test("validation targets → isWritable false", () => {
    const result = assembleComposableRemainingAccounts({
      preTargets: [PublicKey.unique()],
      forwardAccounts: [],
      postTargets: [PublicKey.unique()],
    });
    expect(result.every((m) => m.isWritable === false)).toBe(true);
  });

  test("forward accounts → isWritable from builder", () => {
    const writableKey = PublicKey.unique();
    const readonlyKey = PublicKey.unique();
    const result = assembleComposableRemainingAccounts({
      preTargets: [],
      forwardAccounts: [
        { pubkey: writableKey, isWritable: true },
        { pubkey: readonlyKey, isWritable: false },
      ],
      postTargets: [],
    });
    expect(result[0].isWritable).toBe(true);
    expect(result[1].isWritable).toBe(false);
  });

  test("all empty → empty array", () => {
    expect(
      assembleComposableRemainingAccounts({
        preTargets: [],
        forwardAccounts: [],
        postTargets: [],
      })
    ).toEqual([]);
  });
});

// ── deriveSchedulerAta ───────────────────────────────────────────────

describe("deriveSchedulerAta", () => {
  test("authority == gateway.signer → null (trusted signer path)", () => {
    const signer = PublicKey.unique();
    expect(
      deriveSchedulerAta({
        authority: signer,
        gatewaySigner: signer,
        schedulerShareBps: 100,
        inputMint: PublicKey.unique(),
      })
    ).toBeNull();
  });

  test("permissionless but schedulerShare=0 → null", () => {
    expect(
      deriveSchedulerAta({
        authority: PublicKey.unique(),
        gatewaySigner: PublicKey.unique(),
        schedulerShareBps: 0,
        inputMint: PublicKey.unique(),
      })
    ).toBeNull();
  });

  test("permissionless + schedulerShare>0 → input-mint ATA of authority", () => {
    const relayer = PublicKey.unique();
    const mint = PublicKey.unique();
    const ata = deriveSchedulerAta({
      authority: relayer,
      gatewaySigner: PublicKey.unique(),
      schedulerShareBps: 50,
      inputMint: mint,
    });
    expect(ata).not.toBeNull();
    const expected = getAssociatedTokenAddressSync(mint, relayer);
    expect(ata!.equals(expected)).toBe(true);
  });

  test("schedulerShare just above zero (1 bps) → still derives", () => {
    expect(
      deriveSchedulerAta({
        authority: PublicKey.unique(),
        gatewaySigner: PublicKey.unique(),
        schedulerShareBps: 1,
        inputMint: PublicKey.unique(),
      })
    ).not.toBeNull();
  });
});
