/**
 * Composable fee-rebase (ADR-0026) integration tests.
 *
 * Scope — what these tests pin:
 *  • Create-time reject: forward disabled + output_mint != input_mint.
 *  • Fee accounts are input-side (output_mint ATA rejected with TokenMintMismatch).
 *  • PayAsYouGo caps bind on GROSS pull (face + fee), not face.
 *  • Delegate approval binds on GROSS (face + fee).
 *  • Fee-bps hike after policy creation fails the next execute at the delegate.
 *  • Successful execute with non-zero bps skims protocol + gateway cuts in
 *    input_mint before the (here disabled) forward, and sweeps face to the
 *    recipient.
 *
 * What these tests DO NOT cover (and why):
 *  • Shape 3 (act mode) end-to-end execute: the design (ADR-0026 §Out of
 *    scope) explicitly declines to expand ALLOWED_FORWARD_PROGRAMS, so no
 *    on-allowlist forwarder consumes input without producing output. The
 *    Velocity/collateral primitive is accommodated but not exercised here.
 *    The settlement-shape dispatch (is_act / is_deliver_transform /
 *    needs_output_ata) is covered by Rust unit tests on ForwardConfig.
 *  • >0 output guard (deliver-transform): covered by topup-balance-swap.test.ts.
 *  • Shape 1 (deliver, no transform): covered by topup-balance.test.ts.
 *
 * Settlement shapes matrix (ADR-0026):
 *   shape               | forward   | output_mint        | guard
 *   --------------------|-----------|--------------------|------------------
 *   1. deliver-no-xform | disabled  | == input_mint      | (this file, exec)
 *   2. deliver-xform    | enabled   | set, != input_mint | swap.test.ts
 *   3. act              | enabled   | sentinel           | Rust unit only
 */
import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { Tributary } from "../target/types/tributary";
import { Tributary as TributarySDK } from "../packages/sdk/src";
import {
  getConfigPda,
  getGatewayPda,
  getUserPaymentPda,
  getComposablePolicyPda,
  getPreValidationPda,
  getPostValidationPda,
  getPaymentsDelegatePda,
} from "../packages/sdk/src/pda";
import { SurfpoolHelper, USDC_MINT, USDT_MINT } from "./surfpool-helpers";
import { LIGHTHOUSE_PUBKEY } from "./constants";

// ── Composable v2.1 helpers (mirrors tests/composable.test.ts) ───────────
const DISABLED_SPEC = { disabled: {} } as any;
const DISABLED_INIT = {
  numPinnedAccounts: 0,
  pinnedAccounts: [PublicKey.default, PublicKey.default],
  validationData: Buffer.alloc(0),
} as any;

function programCallSpec(programId: PublicKey): any {
  return { programCall: { programId } };
}

function validationInit(pinnedAccounts: PublicKey[], data: Buffer): any {
  return {
    numPinnedAccounts: pinnedAccounts.length,
    pinnedAccounts: [
      pinnedAccounts[0] ?? PublicKey.default,
      pinnedAccounts[1] ?? PublicKey.default,
    ],
    validationData: data,
  };
}

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);
const ADMIN_KEYPAIR = [
  238, 31, 185, 140, 54, 107, 145, 78, 166, 97, 25, 234, 169, 89, 102, 11, 16,
  50, 119, 229, 213, 144, 251, 250, 231, 231, 38, 93, 42, 152, 13, 182, 86, 67,
  104, 166, 174, 90, 212, 150, 51, 38, 47, 161, 242, 15, 132, 164, 55, 200, 136,
  167, 125, 249, 228, 30, 132, 100, 67, 255, 185, 242, 47, 145,
];

// TributaryError offsets (base 6000) — see programs/tributary/src/error.rs.
// Anchor custom codes start at 6000 = 0x1770; surfpool surfaces them as
// either 0x<offset+6000 in hex> or "custom program error: <decimal>".
const ERR_INSUFFICIENT_DELEGATED = /0x1775|custom program error.*6005/;
// Caps bind on gross: max_chunk_amount AND period cap AND delegate all bind
// on (face + fee). max_chunk overflow surfaces as InvalidAmount (6001),
// period overflow as InsufficientDelegatedAmount (6005), delegate shortfall
// as InsufficientDelegatedAmount (6005) — all are the gross-binding rule.
const ERR_CAP_OR_DELEGATE_ON_GROSS =
  /0x1771|0x1775|custom program error.*600[15]/;
const ERR_TOKEN_MINT_MISMATCH = /0x178e|custom program error.*6030/;
const ERR_FORWARD_DISABLED_REQUIRES_SAME_MINT =
  /0x17a5|custom program error.*6053/;

// Gateway fee in bps used by the cap-basis / delegate / fee-skim tests.
// 100 bps = 1% — keeps arithmetic integer-friendly while exercising the
// gross-pull path (face + face × bps / 10000).
const GATEWAY_FEE_BPS = 100;

describe("Composable Fee Rebase (ADR-0026)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.tributary as anchor.Program<Tributary>;
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  let surfpool: SurfpoolHelper;
  let sdk: TributarySDK;

  const admin = Keypair.fromSecretKey(Uint8Array.from(ADMIN_KEYPAIR));
  const feeRecipient = Keypair.generate();
  const gatewayAuthority = Keypair.generate();
  const configPDA = getConfigPda(program.programId).address;

  const payer = Keypair.generate();
  const coldWallet = Keypair.generate();

  let gatewayPDA: PublicKey;
  let userPaymentPDA: PublicKey;
  let paymentsDelegatePDA: PublicKey;
  let composablePolicyPDA: PublicKey;
  let preValidationPDA: PublicKey;
  let postValidationPDA: PublicKey;
  let composablePolicyId: number;

  let coldWalletUsdcAta: PublicKey;
  let feeRecipientUsdcAta: PublicKey;
  let adminUsdcAta: PublicKey;

  beforeAll(async () => {
    surfpool = new SurfpoolHelper(connection);

    if (!(await surfpool.isSurfpool())) {
      throw new Error(
        "Not running against Surfpool. Start with: surfpool start --legacy-anchor-compatibility --no-tui"
      );
    }

    // Fund everyone SOL.
    const fundKeys: PublicKey[] = [
      payer.publicKey,
      coldWallet.publicKey,
      feeRecipient.publicKey,
      admin.publicKey,
      gatewayAuthority.publicKey,
      wallet.publicKey,
    ];
    for (const pk of fundKeys) {
      await surfpool.setAccount({
        publicKey: pk,
        lamports: 10_000_000_000,
      });
    }

    sdk = new TributarySDK(connection, wallet.payer);

    // Lighthouse must be forked in (composable create resolves its account).
    const lighthouse = await sdk.connection.getAccountInfo(LIGHTHOUSE_PUBKEY);
    expect(lighthouse).not.toBeNull();

    // PDAs.
    gatewayPDA = getGatewayPda(
      gatewayAuthority.publicKey,
      program.programId
    ).address;
    paymentsDelegatePDA = getPaymentsDelegatePda(program.programId).address;
    userPaymentPDA = getUserPaymentPda(
      coldWallet.publicKey,
      USDC_MINT,
      program.programId
    ).address;

    // ATAs.
    coldWalletUsdcAta = getAssociatedTokenAddressSync(
      USDC_MINT,
      coldWallet.publicKey
    );
    feeRecipientUsdcAta = getAssociatedTokenAddressSync(
      USDC_MINT,
      feeRecipient.publicKey
    );
    adminUsdcAta = getAssociatedTokenAddressSync(USDC_MINT, admin.publicKey);

    const ataTx = new Transaction();
    for (const ata of [
      [coldWalletUsdcAta, coldWallet.publicKey],
      [feeRecipientUsdcAta, feeRecipient.publicKey],
      [adminUsdcAta, admin.publicKey],
    ]) {
      ataTx.add(
        createAssociatedTokenAccountInstruction(
          admin.publicKey,
          ata[0] as PublicKey,
          ata[1] as PublicKey,
          USDC_MINT
        )
      );
    }
    try {
      await sendAndConfirmTransaction(connection, ataTx, [admin], {
        commitment: "processed",
      });
    } catch {
      /* ATAs exist */
    }

    // Fund coldWallet's USDC ATA. createUserPayment requires it to exist
    // (it stores the owner + mint against the on-chain token account).
    await surfpool.setTokenAccount({
      owner: coldWallet.publicKey,
      mint: USDC_MINT,
      amount: 1_000_000_000,
    });

    // Fee ATAs must exist (typed TokenAccount in the execute accounts struct).
    // Initialize to 0 so the skim has somewhere to land.
    await surfpool.setTokenAccount({
      owner: feeRecipient.publicKey,
      mint: USDC_MINT,
      amount: 0,
    });
    await surfpool.setTokenAccount({
      owner: admin.publicKey,
      mint: USDC_MINT,
      amount: 0,
    });

    // Mock admin into ProgramConfig (matches topup-balance.test.ts pattern).
    const configAccount = await sdk.getProgramConfig(configPDA);
    configAccount.admin = admin.publicKey;
    configAccount.feeRecipient = admin.publicKey;
    const serialized = await program.coder.accounts.encode(
      "programConfig",
      configAccount
    );
    await surfpool.setAccount({
      publicKey: configPDA,
      data: serialized.toString("hex"),
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 1. Create gateway with NON-ZERO fee bps — exercises gross pull math.
  // ───────────────────────────────────────────────────────────────────────
  test("create gateway with 100 bps fee", async () => {
    await sdk.updateWallet(new anchor.Wallet(admin));

    const gatewayIx = await sdk.createPaymentGateway(
      gatewayAuthority.publicKey,
      GATEWAY_FEE_BPS,
      0, // schedulerShareBps — 0 (no scheduler cut)
      feeRecipient.publicKey,
      "Rebase Gateway",
      "https://tributary.so"
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(gatewayIx),
      [admin],
      { commitment: "processed" }
    );

    const gatewayAccount = await sdk.getPaymentGateway(gatewayPDA);
    expect(gatewayAccount!.authority).toEqual(gatewayAuthority.publicKey);
    expect(gatewayAccount!.feeRecipient).toEqual(feeRecipient.publicKey);
    expect(gatewayAccount!.gatewayFeeBps).toBe(GATEWAY_FEE_BPS);
  });

  test("create coldWallet user payment", async () => {
    await sdk.updateWallet(new anchor.Wallet(coldWallet));
    const ix = await sdk.createUserPayment(USDC_MINT);
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(ix),
      [coldWallet],
      { commitment: "processed" }
    );

    const up = await sdk.getUserPayment(userPaymentPDA);
    expect(up!.owner).toEqual(coldWallet.publicKey);
    expect(up!.tokenMint).toEqual(USDC_MINT);
  });

  // ───────────────────────────────────────────────────────────────────────
  // 2. Create-time hard reject: forward disabled AND output_mint != input.
  // ───────────────────────────────────────────────────────────────────────
  test("create composable policy REJECTS forward_disabled + mismatched output_mint", async () => {
    await sdk.updateWallet(new anchor.Wallet(coldWallet));

    const userPayment = await sdk.getUserPayment(userPaymentPDA);
    const policyId = (userPayment!.createdComposableCount ?? 0) + 1;
    const policyPda = getComposablePolicyPda(
      userPaymentPDA,
      policyId,
      program.programId
    ).address;

    // forward disabled (program_id = default), but output_mint = USDT !=
    // input_mint (USDC) — must hard-reject.
    const forwardConfig = {
      inputMint: USDC_MINT,
      outputMint: USDT_MINT, // ← mismatched
      forwardFlags: 0,
      instructionConstraint: {
        programId: PublicKey.default,
        numDataChecks: 0,
        dataChecks: [
          { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
          { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
          { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
          { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
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

    const policyType = {
      payAsYouGo: {
        maxAmountPerPeriod: new anchor.BN(1_000_000_000),
        maxChunkAmount: new anchor.BN(500_000_000),
        periodLengthSeconds: new anchor.BN(30 * 24 * 3600),
        currentPeriodStart: new anchor.BN(Math.floor(Date.now() / 1000)),
        currentPeriodTotal: new anchor.BN(0),
        expiryDate: null,
        padding: new Array(79).fill(0),
      },
    };

    try {
      const ix = await program.methods
        .createComposablePolicy(
          policyType,
          new Array(32).fill(0),
          forwardConfig,
          DISABLED_SPEC,
          DISABLED_INIT,
          DISABLED_SPEC,
          DISABLED_INIT
        )
        .accountsStrict({
          feePayer: coldWallet.publicKey,
          recipient: coldWallet.publicKey,
          user: coldWallet.publicKey,
          composablePolicy: policyPda,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          preValidationPda: getPreValidationPda(policyPda, program.programId)
            .address,
          postValidationPda: getPostValidationPda(policyPda, program.programId)
            .address,
          preValidationProgram: SystemProgram.programId,
          postValidationProgram: SystemProgram.programId,
          inputMint: USDC_MINT,
          outputMint: USDT_MINT,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [coldWallet],
        { commitment: "processed" }
      );
      expect(true).toBe(false); // unreachable
    } catch (err: any) {
      expect(err.message).toMatch(ERR_FORWARD_DISABLED_REQUIRES_SAME_MINT);
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // 3. Create a deliver-no-transform composable policy with non-zero bps.
  //    PayAsYouGo cap is set to face; the gross pull (face + fee) is what
  //    the delegate must cover and what the cap binds to.
  // ───────────────────────────────────────────────────────────────────────
  const FACE_AMOUNT = 50_000_000; // 50 USDC
  // gross pull = face + face × bps / 10000
  const GROSS_PULL = FACE_AMOUNT + (FACE_AMOUNT * GATEWAY_FEE_BPS) / 10000;

  test("create deliver-no-transform composable policy (non-zero bps)", async () => {
    await sdk.updateWallet(new anchor.Wallet(coldWallet));

    const userPayment = await sdk.getUserPayment(userPaymentPDA);
    composablePolicyId = (userPayment!.createdComposableCount ?? 0) + 1;
    composablePolicyPDA = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    ).address;
    preValidationPDA = getPreValidationPda(
      composablePolicyPDA,
      program.programId
    ).address;
    postValidationPDA = getPostValidationPda(
      composablePolicyPDA,
      program.programId
    ).address;

    // PayAsYouGo cap = exactly face. face alone passes; face + fee overflows.
    // Caps bind on GROSS — see execute_composable.rs validate_policy_execution.
    const now = Math.floor(Date.now() / 1000);
    const policyType = {
      payAsYouGo: {
        maxAmountPerPeriod: new anchor.BN(FACE_AMOUNT),
        maxChunkAmount: new anchor.BN(FACE_AMOUNT),
        periodLengthSeconds: new anchor.BN(30 * 24 * 3600),
        currentPeriodStart: new anchor.BN(now),
        currentPeriodTotal: new anchor.BN(0),
        expiryDate: null,
        padding: new Array(79).fill(0),
      },
    };

    const forwardConfig = {
      inputMint: USDC_MINT,
      outputMint: USDC_MINT,
      forwardFlags: 0,
      instructionConstraint: {
        programId: PublicKey.default,
        numDataChecks: 0,
        dataChecks: [
          { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
          { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
          { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
          { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
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

    const ix = await program.methods
      .createComposablePolicy(
        policyType,
        new Array(32).fill(0),
        forwardConfig,
        DISABLED_SPEC,
        DISABLED_INIT,
        DISABLED_SPEC,
        DISABLED_INIT
      )
      .accountsStrict({
        feePayer: coldWallet.publicKey,
        recipient: coldWallet.publicKey,
        user: coldWallet.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationPda: preValidationPDA,
        postValidationPda: postValidationPDA,
        preValidationProgram: SystemProgram.programId,
        postValidationProgram: SystemProgram.programId,
        inputMint: USDC_MINT,
        outputMint: USDC_MINT,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(ix),
      [coldWallet],
      { commitment: "processed" }
    );

    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.status).toEqual({ active: {} });
    expect(policy.forwardConfig.outputMint).toEqual(USDC_MINT);
  });

  // ───────────────────────────────────────────────────────────────────────
  // 4. Cap-basis + delegate-gross: face + fee > cap AND delegate < face+fee.
  //    Both user-protective failures route through InsufficientDelegatedAmount.
  //    Here cap = face, so face+fee trips BOTH the cap and (with delegate set
  //    to face) the delegate check.
  // ───────────────────────────────────────────────────────────────────────
  test("execute fails: cap binds on GROSS (face+fee > cap) and delegate < gross", async () => {
    await sdk.updateWallet(new anchor.Wallet(coldWallet));

    // Fund coldWallet: balance > gross (so balance isn't the binding
    // constraint). Delegate set to face only — gross is face+fee.
    await surfpool.setTokenAccount({
      owner: coldWallet.publicKey,
      mint: USDC_MINT,
      amount: 10 * GROSS_PULL,
      delegate: userPaymentPDA,
      delegatedAmount: FACE_AMOUNT, // ← delegate = face, NOT gross
    });

    const intermediateInputTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      composablePolicyPDA,
      true,
      TOKEN_PROGRAM_ID
    );

    try {
      const ix = await program.methods
        .executeComposable(Buffer.alloc(0), new anchor.BN(FACE_AMOUNT))
        .accountsStrict({
          feePayer: coldWallet.publicKey,
          paymentsDelegate: paymentsDelegatePDA,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          preValidationProgram: SystemProgram.programId,
          postValidationProgram: SystemProgram.programId,
          preValidationPda: preValidationPDA,
          postValidationPda: postValidationPDA,
          userTokenAccount: coldWalletUsdcAta,
          mint: USDC_MINT,
          outputMint: USDC_MINT,
          intermediateInputTokenAccount,
          intermediateOutputTokenAccount: intermediateInputTokenAccount,
          recipientTokenAccount: coldWalletUsdcAta,
          gatewayFeeAccount: feeRecipientUsdcAta,
          protocolFeeAccount: adminUsdcAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts([])
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [coldWallet],
        { commitment: "processed" }
      );
      expect(true).toBe(false);
    } catch (err: any) {
      // Caps bind on gross: chunk (= gross) > max_chunk_amount → 6001
      // (InvalidAmount); OR period cap exceeded → 6005; OR delegate < gross
      // → 6005. All three are the gross-binding principle.
      expect(err.message).toMatch(ERR_CAP_OR_DELEGATE_ON_GROSS);
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // 5. Cap-basis only (delegate covers gross): face+fee > cap → 6005.
  //    Isolates the cap failure from the delegate failure.
  // ───────────────────────────────────────────────────────────────────────
  test("execute fails: cap binds on GROSS even when delegate covers gross", async () => {
    await sdk.updateWallet(new anchor.Wallet(coldWallet));

    // Delegate now covers gross — isolates the cap check.
    await surfpool.setTokenAccount({
      owner: coldWallet.publicKey,
      mint: USDC_MINT,
      amount: 10 * GROSS_PULL,
      delegate: userPaymentPDA,
      delegatedAmount: GROSS_PULL, // ← enough for delegate; cap still trips
    });

    const intermediateInputTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      composablePolicyPDA,
      true,
      TOKEN_PROGRAM_ID
    );

    try {
      const ix = await program.methods
        .executeComposable(Buffer.alloc(0), new anchor.BN(FACE_AMOUNT))
        .accountsStrict({
          feePayer: coldWallet.publicKey,
          paymentsDelegate: paymentsDelegatePDA,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          preValidationProgram: SystemProgram.programId,
          postValidationProgram: SystemProgram.programId,
          preValidationPda: preValidationPDA,
          postValidationPda: postValidationPDA,
          userTokenAccount: coldWalletUsdcAta,
          mint: USDC_MINT,
          outputMint: USDC_MINT,
          intermediateInputTokenAccount,
          intermediateOutputTokenAccount: intermediateInputTokenAccount,
          recipientTokenAccount: coldWalletUsdcAta,
          gatewayFeeAccount: feeRecipientUsdcAta,
          protocolFeeAccount: adminUsdcAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts([])
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [coldWallet],
        { commitment: "processed" }
      );
      expect(true).toBe(false);
    } catch (err: any) {
      // Cap binds on gross: face+fee > cap(=face) → 6001 or 6005.
      expect(err.message).toMatch(ERR_CAP_OR_DELEGATE_ON_GROSS);
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // 6. Happy path: delegate = gross, cap raised to gross → execute succeeds.
  //    Verifies input-side fee skim (gateway + protocol in input_mint, 0 on
  //    output_mint accounts), and recipient receives face.
  // ───────────────────────────────────────────────────────────────────────
  test("execute succeeds: delegate + cap cover gross; fee skim in input_mint", async () => {
    await sdk.updateWallet(new anchor.Wallet(coldWallet));

    // Bump the cap to GROSS_PULL via fresh policy. (PayAsYouGo period
    // counter is per-policy; cheaper to mint a new policy than time-travel.)
    await surfpool.setTokenAccount({
      owner: coldWallet.publicKey,
      mint: USDC_MINT,
      amount: 1_000_000_000,
      delegate: userPaymentPDA,
      delegatedAmount: GROSS_PULL,
    });

    // Create a second deliver-no-transform policy with cap = gross.
    const userPayment = await sdk.getUserPayment(userPaymentPDA);
    const policyId2 = (userPayment!.createdComposableCount ?? 0) + 1;
    const policyPda2 = getComposablePolicyPda(
      userPaymentPDA,
      policyId2,
      program.programId
    ).address;

    const now = Math.floor(Date.now() / 1000);
    const policyType = {
      payAsYouGo: {
        maxAmountPerPeriod: new anchor.BN(GROSS_PULL + 1),
        maxChunkAmount: new anchor.BN(GROSS_PULL + 1),
        periodLengthSeconds: new anchor.BN(30 * 24 * 3600),
        currentPeriodStart: new anchor.BN(now),
        currentPeriodTotal: new anchor.BN(0),
        expiryDate: null,
        padding: new Array(79).fill(0),
      },
    };
    const forwardConfig = {
      inputMint: USDC_MINT,
      outputMint: USDC_MINT,
      forwardFlags: 0,
      instructionConstraint: {
        programId: PublicKey.default,
        numDataChecks: 0,
        dataChecks: [
          { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
          { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
          { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
          { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
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

    const createIx = await program.methods
      .createComposablePolicy(
        policyType,
        new Array(32).fill(0),
        forwardConfig,
        DISABLED_SPEC,
        DISABLED_INIT,
        DISABLED_SPEC,
        DISABLED_INIT
      )
      .accountsStrict({
        feePayer: coldWallet.publicKey,
        recipient: coldWallet.publicKey,
        user: coldWallet.publicKey,
        composablePolicy: policyPda2,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationPda: getPreValidationPda(policyPda2, program.programId)
          .address,
        postValidationPda: getPostValidationPda(policyPda2, program.programId)
          .address,
        preValidationProgram: SystemProgram.programId,
        postValidationProgram: SystemProgram.programId,
        inputMint: USDC_MINT,
        outputMint: USDC_MINT,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createIx),
      [coldWallet],
      { commitment: "processed" }
    );

    // Pre-fund fee ATAs empty so skim lands cleanly.
    await surfpool.setTokenAccount({
      owner: feeRecipient.publicKey,
      mint: USDC_MINT,
      amount: 0,
    });
    await surfpool.setTokenAccount({
      owner: admin.publicKey,
      mint: USDC_MINT,
      amount: 0,
    });

    const coldBefore = await connection.getTokenAccountBalance(
      coldWalletUsdcAta
    );
    const coldBalanceBefore = Number(coldBefore.value.amount);

    const intermediateInputTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      policyPda2,
      true,
      TOKEN_PROGRAM_ID
    );

    const execIx = await program.methods
      .executeComposable(Buffer.alloc(0), new anchor.BN(FACE_AMOUNT))
      .accountsStrict({
        feePayer: coldWallet.publicKey,
        paymentsDelegate: paymentsDelegatePDA,
        composablePolicy: policyPda2,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        preValidationProgram: SystemProgram.programId,
        postValidationProgram: SystemProgram.programId,
        preValidationPda: getPreValidationPda(policyPda2, program.programId)
          .address,
        postValidationPda: getPostValidationPda(policyPda2, program.programId)
          .address,
        userTokenAccount: coldWalletUsdcAta,
        mint: USDC_MINT,
        outputMint: USDC_MINT,
        intermediateInputTokenAccount,
        intermediateOutputTokenAccount: intermediateInputTokenAccount,
        recipientTokenAccount: coldWalletUsdcAta,
        gatewayFeeAccount: feeRecipientUsdcAta,
        protocolFeeAccount: adminUsdcAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts([])
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(execIx),
      [coldWallet],
      { commitment: "processed" }
    );

    // coldWallet is BOTH user and recipient here (recipient defaults to fee
    // payer on create). Net effect: balance drops by `gross_pull`, recipient
    // receives `face` → balance_after = balance_before - gross_pull + face
    //                                      = balance_before - total_fee.
    const totalFee = GROSS_PULL - FACE_AMOUNT; // = face × bps / 10000
    const coldAfter = await connection.getTokenAccountBalance(
      coldWalletUsdcAta
    );
    expect(Number(coldAfter.value.amount)).toBe(
      coldBalanceBefore - GROSS_PULL + FACE_AMOUNT
    );

    // Fee conservation (ADR-0017 carve-out): gateway_fee + protocol_fee
    // == total_fee, regardless of how the protocol_share_bps splits it.
    // Read the actual share from config — surfpool mainnet-fork may carry
    // a non-default value.
    const cfg = await program.account.programConfig.fetch(configPDA);
    const protocolCut = Math.floor((totalFee * cfg.protocolShareBps) / 10000);
    const expectedGatewayFee = totalFee - protocolCut;

    const feeRecipientAfter = await connection.getTokenAccountBalance(
      feeRecipientUsdcAta
    );
    expect(Number(feeRecipientAfter.value.amount)).toBe(expectedGatewayFee);

    const adminAfter = await connection.getTokenAccountBalance(adminUsdcAta);
    expect(Number(adminAfter.value.amount)).toBe(protocolCut);

    // Policy state: gross pulled tracked on total_input.
    const policy = await program.account.composablePolicy.fetch(policyPda2);
    expect(policy.totalInput.toNumber()).toBe(GROSS_PULL);
    expect(policy.policyType.payAsYouGo.currentPeriodTotal.toNumber()).toBe(
      GROSS_PULL
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // 7. Fee-account denomination: pass USDT ATA where input_mint (USDC) ATA
  //    is required → TokenMintMismatch on the gateway_fee_account constraint.
  // ───────────────────────────────────────────────────────────────────────
  test("execute fails: gateway fee account in wrong mint (output-side ATA)", async () => {
    await sdk.updateWallet(new anchor.Wallet(coldWallet));

    // Restore delegate / balance for the original policy.
    await surfpool.setTokenAccount({
      owner: coldWallet.publicKey,
      mint: USDC_MINT,
      amount: 1_000_000_000,
      delegate: userPaymentPDA,
      delegatedAmount: GROSS_PULL,
    });

    // Mint feeRecipient a USDT ATA and pass it as gatewayFeeAccount — the
    // input_mint constraint must reject it.
    const feeRecipientUsdtAta = getAssociatedTokenAddressSync(
      USDT_MINT,
      feeRecipient.publicKey
    );
    try {
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(
          createAssociatedTokenAccountInstruction(
            admin.publicKey,
            feeRecipientUsdtAta,
            feeRecipient.publicKey,
            USDT_MINT
          )
        ),
        [admin],
        { commitment: "processed" }
      );
    } catch {
      /* exists */
    }

    const intermediateInputTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      composablePolicyPDA,
      true,
      TOKEN_PROGRAM_ID
    );

    try {
      const ix = await program.methods
        .executeComposable(Buffer.alloc(0), new anchor.BN(FACE_AMOUNT))
        .accountsStrict({
          feePayer: coldWallet.publicKey,
          paymentsDelegate: paymentsDelegatePDA,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          preValidationProgram: SystemProgram.programId,
          postValidationProgram: SystemProgram.programId,
          preValidationPda: preValidationPDA,
          postValidationPda: postValidationPDA,
          userTokenAccount: coldWalletUsdcAta,
          mint: USDC_MINT,
          outputMint: USDC_MINT,
          intermediateInputTokenAccount,
          intermediateOutputTokenAccount: intermediateInputTokenAccount,
          recipientTokenAccount: coldWalletUsdcAta,
          gatewayFeeAccount: feeRecipientUsdtAta, // ← wrong mint
          protocolFeeAccount: adminUsdcAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts([])
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [coldWallet],
        { commitment: "processed" }
      );
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toMatch(ERR_TOKEN_MINT_MISMATCH);
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // 8. Fee-bps hike: policy was set up with delegate = gross_pull (covers
  //    current bps). Hike the gateway fee → next execute fails delegate
  //    check (delegate no longer covers the new, higher gross pull).
  //    Accepted consequence per ADR-0026 §Caps and delegate.
  // ───────────────────────────────────────────────────────────────────────
  test("fee-bps hike fails next execute at delegate (gross grew)", async () => {
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    // Hike the gateway fee bps. Delegate was sized for GATEWAY_FEE_BPS.
    const hikeIx = await sdk.changeGatewayFeeBps(
      gatewayAuthority.publicKey,
      GATEWAY_FEE_BPS * 10 // 10× hike → new gross strictly exceeds delegate
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(hikeIx),
      [gatewayAuthority],
      { commitment: "processed" }
    );

    await sdk.updateWallet(new anchor.Wallet(coldWallet));

    const intermediateInputTokenAccount = getAssociatedTokenAddressSync(
      USDC_MINT,
      composablePolicyPDA,
      true,
      TOKEN_PROGRAM_ID
    );

    try {
      const ix = await program.methods
        .executeComposable(Buffer.alloc(0), new anchor.BN(FACE_AMOUNT))
        .accountsStrict({
          feePayer: coldWallet.publicKey,
          paymentsDelegate: paymentsDelegatePDA,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          preValidationProgram: SystemProgram.programId,
          postValidationProgram: SystemProgram.programId,
          preValidationPda: preValidationPDA,
          postValidationPda: postValidationPDA,
          userTokenAccount: coldWalletUsdcAta,
          mint: USDC_MINT,
          outputMint: USDC_MINT,
          intermediateInputTokenAccount,
          intermediateOutputTokenAccount: intermediateInputTokenAccount,
          recipientTokenAccount: coldWalletUsdcAta,
          gatewayFeeAccount: feeRecipientUsdcAta,
          protocolFeeAccount: adminUsdcAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts([])
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [coldWallet],
        { commitment: "processed" }
      );
      expect(true).toBe(false);
    } catch (err: any) {
      // Delegate was sized for the old bps; new gross > delegate → 6005.
      // Also covers max_chunk_amount trip (6001) — both bind on gross.
      expect(err.message).toMatch(ERR_CAP_OR_DELEGATE_ON_GROSS);
    }
  });
});
