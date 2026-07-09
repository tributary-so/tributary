/**
 * Unit tests for the high-level composable SDK ergonomics (bean tributary-rg9m):
 *   - createComposable()          — full ix bundle (ATA ensure + userPayment
 *                                   ensure + policy + delegate approve)
 *   - executeComposable()         — prepends ATA ensures for recipient + fee
 *                                   accounts
 *   - calculatePolicyApprovalAmount() — face-only dispatcher over all 5
 *                                   PolicyType variants
 *
 * These are PURE unit tests — no validator, no Surfpool. The SDK is built
 * against the compiled IDL (target/idl) and its RPC touch-points are stubbed,
 * so `.instruction()` encodes locally (Anchor's instruction coder needs no
 * connection). Pattern mirrors tests/scheduler-evaluator.test.ts.
 */
import * as anchor from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  Connection,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";
import { Tributary as TributarySDK } from "../packages/sdk/src";

const PROGRAM_ID = new PublicKey("TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ");

// ── SDK factory with RPC neutralised ───────────────────────────────────
function makeSdk(user = Keypair.generate()): TributarySDK {
  const conn = new Connection("http://127.0.0.1:1"); // lazy; never contacted
  const sdk = new TributarySDK(conn, user);
  // Neutralise every RPC touch-point the high-level methods use.
  (sdk as any).connection = {
    getAccountInfo: async () => null,
    getParsedAccountInfo: async () => ({ value: null, context: { slot: 0 } }),
  };
  return sdk;
}

function forwardConfigNoSwap(inputMint: PublicKey): any {
  // Forward disabled (deliver-no-transform): outputMint == inputMint and the
  // instruction-constraint program is the sentinel PublicKey.default().
  return {
    inputMint,
    outputMint: inputMint,
    forwardFlags: 0,
    instructionConstraint: {
      programId: PublicKey.default,
      numDataChecks: 0,
      dataChecks: [
        { offset: 0, bytes: [0, 0, 0, 0] },
        { offset: 0, bytes: [0, 0, 0, 0] },
        { offset: 0, bytes: [0, 0, 0, 0] },
        { offset: 0, bytes: [0, 0, 0, 0] },
      ],
      numPinnedAccounts: 0,
      pinnedAccounts: [
        PublicKey.default,
        PublicKey.default,
        PublicKey.default,
        PublicKey.default,
      ],
    },
  };
}

function subscriptionPolicy(amount: number): any {
  return {
    subscription: {
      amount: new BN(amount),
      autoRenew: true,
      maxRenewals: 12,
      paymentFrequency: { monthly: {} },
      nextPaymentDue: new BN(0),
    },
  };
}

function ataIxCount(ixs: TransactionInstruction[]): number {
  return ixs.filter((ix) => ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID))
    .length;
}

function tokenIxCount(ixs: TransactionInstruction[]): number {
  return ixs.filter((ix) => ix.programId.equals(TOKEN_PROGRAM_ID)).length;
}

// ═══════════════════════════════════════════════════════════════════════
// calculatePolicyApprovalAmount — face-only dispatcher (5 variants)
// ═══════════════════════════════════════════════════════════════════════
describe("calculatePolicyApprovalAmount (face-only dispatcher)", () => {
  const sdk = makeSdk();
  const dispatch = (pt: any) =>
    (sdk as any).calculatePolicyApprovalAmount(pt) as BN;

  test("subscription → amount × effective renewals (1yr when unlimited)", () => {
    const amt = dispatch({
      subscription: {
        amount: new BN(1_000_000),
        autoRenew: true,
        maxRenewals: null, // unlimited → 1yr (12 monthly)
        paymentFrequency: { monthly: {} },
        nextPaymentDue: new BN(0),
      },
    });
    // monthly = 12/yr, unlimited → effectiveRenewals = 12
    expect(amt.toString()).toBe(new BN(1_000_000).mul(new BN(12)).toString());
  });

  test("milestone → sum of milestone amounts", () => {
    const amt = dispatch({
      milestone: {
        milestoneAmounts: [new BN(100), new BN(200), new BN(300), new BN(0)],
        milestoneTimestamps: [new BN(0), new BN(0), new BN(0), new BN(0)],
        currentMilestone: 0,
        releaseCondition: 1,
        totalMilestones: 3,
        escrowAmount: new BN(600),
      },
    });
    expect(amt.toString()).toBe("600");
  });

  test("payAsYouGo → maxAmountPerPeriod × periods-per-year", () => {
    const amt = dispatch({
      payAsYouGo: {
        maxAmountPerPeriod: new BN(50_000_000),
        maxChunkAmount: new BN(1_000_000),
        periodLengthSeconds: new BN(86400), // daily
        currentPeriodStart: new BN(0),
        currentPeriodTotal: new BN(0),
        expiryDate: null,
      },
    });
    // 365*24*3600 / 86400 = 365 periods
    expect(amt.toString()).toBe(new BN(50_000_000).mul(new BN(365)).toString());
  });

  test("oneTime → face amount", () => {
    const amt = dispatch({
      oneTime: {
        amount: new BN(7_777_777),
        dueDate: new BN(0),
        expiryDate: null,
      },
    });
    expect(amt.toString()).toBe("7777777");
  });

  test("upTo → maxAmount", () => {
    const amt = dispatch({
      upTo: {
        maxAmount: new BN(9_999),
        validAfter: new BN(0),
        deadline: new BN(1),
      },
    });
    expect(amt.toString()).toBe("9999");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// createComposable — high-level constructor
// ═══════════════════════════════════════════════════════════════════════
describe("createComposable", () => {
  const tokenMint = Keypair.generate().publicKey;
  const recipient = Keypair.generate().publicKey;
  const gateway = Keypair.generate().publicKey;

  test("emits [ownerATA, userPayment, policy, revoke, approve] when all missing", async () => {
    const sdk = makeSdk();
    // owner ATA missing (getAccountInfo→null) + userPayment missing
    (sdk as any).program.account.userPayment.fetchNullable = async () => null;
    // parsed token account missing → needsApproval true
    (sdk as any).connection.getParsedAccountInfo = async () => ({
      value: null,
      context: { slot: 0 },
    });

    const ixs = await sdk.createComposable(
      tokenMint,
      recipient,
      gateway,
      subscriptionPolicy(1_000_000),
      "memo",
      forwardConfigNoSwap(tokenMint)
    );

    // Order: [ownerATA(create), userPayment(create), policy, revoke, approve]
    expect(ixs.length).toBe(5);
    expect(ixs[0].programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)).toBe(true);
    // userPayment create + policy create are both Tributary-program ixs
    // (createUserPayment builds the PDA via an Anchor `init` CPI, so the
    // ix targets the program, not SystemProgram directly).
    expect(ixs[1].programId.equals(PROGRAM_ID)).toBe(true);
    expect(ixs[2].programId.equals(PROGRAM_ID)).toBe(true);
    // revoke + approve are SPL token ixs
    expect(ixs[3].programId.equals(TOKEN_PROGRAM_ID)).toBe(true);
    expect(ixs[4].programId.equals(TOKEN_PROGRAM_ID)).toBe(true);
  });

  test("idempotent: existing ownerATA + userPayment + delegate → only [policy]", async () => {
    const sdk = makeSdk();
    // owner ATA exists
    (sdk as any).connection.getAccountInfo = async () => ({
      lamports: 1,
      data: Buffer.alloc(0),
      owner: SystemProgram.programId,
      executable: false,
      rentEpoch: 0,
    });
    // userPayment exists
    (sdk as any).program.account.userPayment.fetchNullable = async () => ({
      owner: sdk.provider.publicKey,
      tokenMint,
      createdPoliciesCount: 0,
      createdComposableCount: 0,
    });
    // delegate already correctly set at a huge amount → no revoke/approve
    (sdk as any).connection.getParsedAccountInfo = async () => ({
      value: {
        data: {
          parsed: {
            info: {
              delegate: sdk
                .getUserPaymentPda(sdk.provider.publicKey, tokenMint)
                .address.toString(),
              delegatedAmount: { amount: "999999999999" },
            },
          },
        },
      },
      context: { slot: 0 },
    });

    const ixs = await sdk.createComposable(
      tokenMint,
      recipient,
      gateway,
      subscriptionPolicy(1_000_000),
      "memo",
      forwardConfigNoSwap(tokenMint)
    );

    // Only the policy ix — no ATA, no userPayment, no approve churn.
    expect(ixs.length).toBe(1);
    expect(ixs[0].programId.equals(PROGRAM_ID)).toBe(true);
  });

  test("uses createdComposableCount (not createdPoliciesCount) for policyId", async () => {
    const sdk = makeSdk();
    const user = sdk.provider.publicKey;
    (sdk as any).connection.getAccountInfo = async () => ({
      lamports: 1,
      data: Buffer.alloc(0),
      owner: SystemProgram.programId,
      executable: false,
      rentEpoch: 0,
    });
    (sdk as any).program.account.userPayment.fetchNullable = async () => ({
      owner: user,
      tokenMint,
      createdPoliciesCount: 5, // regular policies — must NOT be used
      createdComposableCount: 2, // → next composable policyId = 3
    });
    (sdk as any).connection.getParsedAccountInfo = async () => ({
      value: {
        data: {
          parsed: {
            info: {
              delegate: sdk
                .getUserPaymentPda(user, tokenMint)
                .address.toString(),
              delegatedAmount: { amount: "999999999999" },
            },
          },
        },
      },
      context: { slot: 0 },
    });

    const ixs = await sdk.createComposable(
      tokenMint,
      recipient,
      gateway,
      subscriptionPolicy(1_000_000),
      "memo",
      forwardConfigNoSwap(tokenMint)
    );

    const { address: userPaymentPda } = sdk.getUserPaymentPda(user, tokenMint);
    const expectedPda = sdk.getComposablePolicyPda(userPaymentPda, 3).address;
    // The policy ix must reference composablePolicy == PDA(policyId=3).
    const policyIx = ixs.find((ix) => ix.programId.equals(PROGRAM_ID))!;
    const referenced = policyIx.keys.find((k) => k.pubkey.equals(expectedPda));
    expect(referenced).toBeDefined();
  });

  test("explicit approvalAmount overrides the dispatcher default", async () => {
    const sdk = makeSdk();
    const user = sdk.provider.publicKey;
    (sdk as any).connection.getAccountInfo = async () => ({
      lamports: 1,
      data: Buffer.alloc(0),
      owner: SystemProgram.programId,
      executable: false,
      rentEpoch: 0,
    });
    (sdk as any).program.account.userPayment.fetchNullable = async () => ({
      owner: user,
      tokenMint,
      createdPoliciesCount: 0,
      createdComposableCount: 0,
    });
    // no delegate set → needs approval
    (sdk as any).connection.getParsedAccountInfo = async () => ({
      value: null,
      context: { slot: 0 },
    });

    const override = new BN(42);
    const ixs = await sdk.createComposable(
      tokenMint,
      recipient,
      gateway,
      subscriptionPolicy(1_000_000),
      "memo",
      forwardConfigNoSwap(tokenMint),
      { disabled: {} }, // preValidation
      [], // prePinnedAccounts
      Buffer.alloc(0), // preValidationData
      { disabled: {} }, // postValidation
      [], // postPinnedAccounts
      Buffer.alloc(0), // postValidationData
      undefined, // feePayer
      override // approvalAmount
    );

    // The approve ix (last) must carry the override amount.
    const approveIx = ixs[ixs.length - 1];
    expect(approveIx.programId.equals(TOKEN_PROGRAM_ID)).toBe(true);
    // SPL Approve ix data: [discriminator(1)] [amount u64 LE]
    const amt = approveIx.data.readBigUInt64LE(1);
    expect(amt).toBe(BigInt(42));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// executeComposable — ATA-ensure prepend
// ═══════════════════════════════════════════════════════════════════════
describe("executeComposable ATA ensures", () => {
  const tokenMint = Keypair.generate().publicKey;

  function mockPolicy(sdk: TributarySDK, inputMint: PublicKey) {
    const user = sdk.provider.publicKey;
    return {
      userPayment: sdk.getUserPaymentPda(user, inputMint).address,
      gateway: Keypair.generate().publicKey,
      recipient: Keypair.generate().publicKey,
      forwardConfig: forwardConfigNoSwap(inputMint), // deliver-no-transform
      preValidation: { disabled: {} },
      postValidation: { disabled: {} },
    };
  }

  test("prepends create-ATA for missing recipient + gatewayFee + protocolFee", async () => {
    const sdk = makeSdk();
    const policy = mockPolicy(sdk, tokenMint);
    (sdk as any).program.account.composablePolicy.fetch = async () => policy;
    (sdk as any).program.account.userPayment.fetch = async () => ({
      owner: sdk.provider.publicKey,
      tokenMint,
    });
    const feeRecipient = Keypair.generate().publicKey;
    const protocolFeeRecipient = Keypair.generate().publicKey;
    (sdk as any).program.account.paymentGateway.fetch = async () => ({
      feeRecipient,
    });
    (sdk as any).program.account.programConfig.fetch = async () => ({
      feeRecipient: protocolFeeRecipient,
    });
    // ALL ATAs missing
    (sdk as any).connection.getAccountInfo = async () => null;

    const ixs = await sdk.executeComposable(
      Keypair.generate().publicKey, // composablePolicy address (unused beyond fetch)
      Buffer.alloc(0),
      null
    );

    // 3 ATA creates (recipient, gatewayFee, protocolFee) + 1 execute ix.
    expect(Array.isArray(ixs)).toBe(true);
    expect(ataIxCount(ixs)).toBe(3);
    // The execute ix is last and targets the program.
    const execIx = ixs[ixs.length - 1];
    expect(execIx.programId.equals(PROGRAM_ID)).toBe(true);
  });

  test("emits nothing extra when all ATAs already exist", async () => {
    const sdk = makeSdk();
    const policy = mockPolicy(sdk, tokenMint);
    (sdk as any).program.account.composablePolicy.fetch = async () => policy;
    (sdk as any).program.account.userPayment.fetch = async () => ({
      owner: sdk.provider.publicKey,
      tokenMint,
    });
    (sdk as any).program.account.paymentGateway.fetch = async () => ({
      feeRecipient: Keypair.generate().publicKey,
    });
    (sdk as any).program.account.programConfig.fetch = async () => ({
      feeRecipient: Keypair.generate().publicKey,
    });
    // ALL ATAs exist
    (sdk as any).connection.getAccountInfo = async () => ({
      lamports: 1,
      data: Buffer.alloc(0),
      owner: SystemProgram.programId,
      executable: false,
      rentEpoch: 0,
    });

    const ixs = await sdk.executeComposable(
      Keypair.generate().publicKey,
      Buffer.alloc(0),
      null
    );

    expect(ataIxCount(ixs)).toBe(0);
    expect(ixs.length).toBe(1);
    expect(ixs[0].programId.equals(PROGRAM_ID)).toBe(true);
  });

  test("never emits intermediate-ATA creates (program-owned)", async () => {
    const sdk = makeSdk();
    const policy = mockPolicy(sdk, tokenMint);
    (sdk as any).program.account.composablePolicy.fetch = async () => policy;
    (sdk as any).program.account.userPayment.fetch = async () => ({
      owner: sdk.provider.publicKey,
      tokenMint,
    });
    (sdk as any).program.account.paymentGateway.fetch = async () => ({
      feeRecipient: Keypair.generate().publicKey,
    });
    (sdk as any).program.account.programConfig.fetch = async () => ({
      feeRecipient: Keypair.generate().publicKey,
    });
    (sdk as any).connection.getAccountInfo = async () => null;

    const ixs = await sdk.executeComposable(
      Keypair.generate().publicKey,
      Buffer.alloc(0),
      null
    );

    // Exactly 3 ATA creates — the two intermediates are created on-chain by
    // the program, never by the SDK. A 4th or 5th ATA ix would be a bug.
    expect(ataIxCount(ixs)).toBe(3);
    expect(tokenIxCount(ixs)).toBe(0); // no stray token ixs
  });
});
