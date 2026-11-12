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
  createTransferCheckedInstruction,
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
import { SurfpoolHelper, USDC_MINT } from "./surfpool-helpers";
import { ADMIN_KEYPAIR } from "./helpers/composable";
import { Buffer } from "buffer";
import type { IdlTypes } from "@coral-xyz/anchor";

type IDL = IdlTypes<Tributary>;

const DISABLED_SPEC: IDL["ValidationSpec"] = { disabled: {} };
const DISABLED_INIT: IDL["ValidationInit"] = {
  numPinnedAccounts: 0,
  pinnedAccounts: [
    { index: 0, pubkey: PublicKey.default },
    { index: 0, pubkey: PublicKey.default },
    { index: 0, pubkey: PublicKey.default },
    { index: 0, pubkey: PublicKey.default },
  ],
  validationData: Buffer.alloc(0),
};

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

describe("Composable intermediate-ATA adoption (SZ-M-2)", () => {
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

  const payer = Keypair.generate(); // cold side: owns the funds
  const recipient = Keypair.generate(); // hot side: gateway signer + payee
  const attacker = Keypair.generate(); // occupies the intermediate ATA

  let gatewayPDA: PublicKey;
  let userPaymentPDA: PublicKey;
  let paymentsDelegatePDA: PublicKey;
  let composablePolicyPDA: PublicKey;
  let preValidationPDA: PublicKey;
  let postValidationPDA: PublicKey;

  let payerUsdcAta: PublicKey;
  let recipientUsdcAta: PublicKey;
  let feeRecipientUsdcAta: PublicKey;
  let adminUsdcAta: PublicKey;
  let attackerUsdcAta: PublicKey;
  let intermediateInput: PublicKey;

  beforeAll(async () => {
    surfpool = new SurfpoolHelper(connection);
    if (!(await surfpool.isSurfpool())) {
      throw new Error(
        "Not running against Surfpool. Start with: surfpool start --legacy-anchor-compatibility --no-tui"
      );
    }

    for (const kp of [admin, feeRecipient, gatewayAuthority, payer, recipient, attacker, wallet.payer]) {
      await surfpool.setAccount({
        publicKey: kp.publicKey,
        lamports: 10_000_000_000,
      });
    }

    sdk = new TributarySDK(connection, wallet.payer);

    gatewayPDA = getGatewayPda(gatewayAuthority.publicKey, program.programId).address;
    paymentsDelegatePDA = getPaymentsDelegatePda(program.programId).address;
    userPaymentPDA = getUserPaymentPda(payer.publicKey, USDC_MINT, program.programId).address;

    payerUsdcAta = getAssociatedTokenAddressSync(USDC_MINT, payer.publicKey);
    recipientUsdcAta = getAssociatedTokenAddressSync(USDC_MINT, recipient.publicKey);
    feeRecipientUsdcAta = getAssociatedTokenAddressSync(USDC_MINT, feeRecipient.publicKey);
    adminUsdcAta = getAssociatedTokenAddressSync(USDC_MINT, admin.publicKey);
    attackerUsdcAta = getAssociatedTokenAddressSync(USDC_MINT, attacker.publicKey);

    // payer: 1000 USDC with delegate = UserPayment PDA (v1 model)
    await surfpool.setTokenAccount({
      owner: payer.publicKey,
      mint: USDC_MINT,
      amount: 1_000_000_000,
      delegate: userPaymentPDA,
      delegatedAmount: 1_000_000_000,
    });
    await surfpool.setTokenAccount({
      owner: recipient.publicKey,
      mint: USDC_MINT,
      amount: 0,
    });
    await surfpool.setTokenAccount({
      owner: feeRecipient.publicKey,
      mint: USDC_MINT,
      amount: 0,
    });
    await surfpool.setTokenAccount({
      owner: attacker.publicKey,
      mint: USDC_MINT,
      amount: 10_000_000, // 10 USDC for the grief donation
    });
    await surfpool.setTokenAccount({
      owner: wallet.publicKey,
      mint: USDC_MINT,
      amount: 0,
    });
    await surfpool.setTokenAccount({
      owner: admin.publicKey,
      mint: USDC_MINT,
      amount: 0, // protocol fee account must exist even at 0 bps
    });

    // Mock admin key into the global state (mirrors topup-balance.test.ts)
    const configAccount = await sdk.getProgramConfig(configPDA);
    configAccount.admin = admin.publicKey;
    configAccount.feeRecipient = admin.publicKey;
    const serialized = await program.coder.accounts.encode("programConfig", configAccount);
    await surfpool.setAccount({
      publicKey: configPDA,
      data: serialized.toString("hex"),
    });
  }, 120_000);

  test("create gateway + user payment + composable policy (no hooks)", async () => {
    await sdk.updateWallet(admin);
    const gatewayIx = await sdk.createPaymentGateway(
      gatewayAuthority.publicKey,
      0, // 0 bps fee — trivial math
      0,
      feeRecipient.publicKey,
      "Gateway",
      "https://tributary.so"
    );
    await sendAndConfirmTransaction(connection, new Transaction().add(gatewayIx), [admin], {
      commitment: "processed",
    });

    await sdk.updateWallet(payer);
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(await sdk.createUserPayment(USDC_MINT)),
      [payer],
      { commitment: "processed" }
    );

    const userPayment = await sdk.getUserPayment(userPaymentPDA);
    const policyId = (userPayment!.createdComposableCount ?? 0) + 1;
    composablePolicyPDA = getComposablePolicyPda(userPaymentPDA, policyId, program.programId).address;
    preValidationPDA = getPreValidationPda(composablePolicyPDA, program.programId).address;
    postValidationPDA = getPostValidationPda(composablePolicyPDA, program.programId).address;

    const now = Math.floor(Date.now() / 1000);
    const policyType: IDL["PolicyType"] = {
      payAsYouGo: {
        maxAmountPerPeriod: new anchor.BN(100_000_000),
        maxChunkAmount: new anchor.BN(50_000_000),
        periodLengthSeconds: new anchor.BN(30 * 24 * 3600),
        currentPeriodStart: new anchor.BN(now),
        currentPeriodTotal: new anchor.BN(0),
        expiryDate: null,
        padding: new Array<number>(79).fill(0),
      },
    };
    const memo = new Array<number>(32).fill(0);
    Buffer.from("SZ-M-2 adoption").copy(Buffer.from(memo));

    const forwardConfig: IDL["ForwardConfig"] = {
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
          { index: 0, pubkey: PublicKey.default },
          { index: 0, pubkey: PublicKey.default },
          { index: 0, pubkey: PublicKey.default },
          { index: 0, pubkey: PublicKey.default },
        ],
      },
    };

    const ix = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        DISABLED_SPEC,
        DISABLED_INIT,
        DISABLED_SPEC,
        DISABLED_INIT
      )
      .accountsStrict({
        feePayer: recipient.publicKey,
        recipient: recipient.publicKey,
        user: payer.publicKey,
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
      [recipient, payer],
      { commitment: "processed" }
    );

    const policy = await program.account.composablePolicy.fetch(composablePolicyPDA);
    expect(policy.status).toEqual({ active: {} });
    expect(policy.recipient).toEqual(recipient.publicKey);
  }, 120_000);

  test("attacker occupies the intermediate ATA (CreateIdempotent) and donates 1 unit", async () => {
    intermediateInput = getAssociatedTokenAddressSync(
      USDC_MINT,
      composablePolicyPDA,
      true,
      TOKEN_PROGRAM_ID
    );

    // The grief: anyone creates the policy-owned intermediate ATA and parks
    // a token in it. Pre-fix this bricked every later execution (6050).
    const occTx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        attacker.publicKey,
        intermediateInput,
        composablePolicyPDA,
        USDC_MINT
      ),
      createTransferCheckedInstruction(
        attackerUsdcAta,
        USDC_MINT,
        intermediateInput,
        attacker.publicKey,
        1,
        6
      )
    );
    await sendAndConfirmTransaction(connection, occTx, [attacker], {
      commitment: "processed",
    });

    const occupied = await connection.getAccountInfo(intermediateInput);
    expect(occupied).not.toBeNull();
    const bal = await connection.getTokenAccountBalance(intermediateInput);
    expect(Number(bal.value.amount)).toBe(1);
  }, 60_000);

  test("execute adopts the occupied intermediate and settles the full balance", async () => {
    await sdk.updateWallet(payer);

    const recipientBefore = Number(
      (await connection.getTokenAccountBalance(recipientUsdcAta)).value.amount
    );
    const payerBefore = Number(
      (await connection.getTokenAccountBalance(payerUsdcAta)).value.amount
    );

    const instructionData = Buffer.alloc(0); // forward disabled
    const accounts = {
      feePayer: payer.publicKey,
      paymentsDelegate: paymentsDelegatePDA,
      composablePolicy: composablePolicyPDA,
      userPayment: userPaymentPDA,
      gateway: gatewayPDA,
      config: configPDA,
      preValidationProgram: SystemProgram.programId,
      postValidationProgram: SystemProgram.programId,
      forwardProgram: SystemProgram.programId,
      preValidationPda: preValidationPDA,
      postValidationPda: postValidationPDA,
      userTokenAccount: payerUsdcAta,
      mint: USDC_MINT,
      outputMint: USDC_MINT,
      intermediateInputTokenAccount: intermediateInput,
      intermediateOutputTokenAccount: intermediateInput,
      recipientTokenAccount: recipientUsdcAta,
      gatewayFeeAccount: feeRecipientUsdcAta,
      protocolFeeAccount: adminUsdcAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: new PublicKey(
        "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
      ),
      systemProgram: SystemProgram.programId,
    };
    const ix = await program.methods
      .executeComposable(instructionData, new anchor.BN(50_000_000))
      .accountsStrict(accounts)
      .remainingAccounts([])
      .instruction();

    // The assertion: this transaction SUCCEEDS on the fixed program.
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer], {
      commitment: "processed",
    });

    // Deliver-no-transform sweeps the FULL intermediate balance: the 50
    // USDC face plus the attacker's donated 1 unit. Fee is 0 bps, so the
    // payer is debited exactly the face.
    const recipientAfter = Number(
      (await connection.getTokenAccountBalance(recipientUsdcAta)).value.amount
    );
    const payerAfter = Number(
      (await connection.getTokenAccountBalance(payerUsdcAta)).value.amount
    );
    expect(recipientAfter - recipientBefore).toBe(50_000_000 + 1);
    expect(payerBefore - payerAfter).toBe(50_000_000);

    // Intermediate closed (rent reclaimed) — next execution starts clean.
    const intermediateAfter = await connection.getAccountInfo(intermediateInput);
    const closed =
      intermediateAfter === null ||
      intermediateAfter.lamports === 0 ||
      intermediateAfter.data.length === 0;
    expect(closed).toBe(true);
  }, 60_000);
});
