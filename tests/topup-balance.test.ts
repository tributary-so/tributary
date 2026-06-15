import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Tributary } from "../target/types/tributary";
import { Tributary as TributarySDK } from "../packages/sdk/src";
import {
  getConfigPda,
  getGatewayPda,
  getUserPaymentPda,
  getComposablePolicyPda,
  getValidationPda,
  getPaymentsDelegatePda,
} from "../packages/sdk/src/pda";
import { SurfpoolHelper, USDC_MINT } from "./surfpool-helpers";
import assert from "assert";
import { Buffer } from "buffer";

const LIGHTHOUSE_PUBKEY = new PublicKey(
  "L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95"
);
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

// ── Lighthouse assertion builder ─────────────────────────────────────────
// Builds a serialized AssertTokenAccount instruction for Lighthouse CPI.
// Layout (12 bytes):
//   [0]    discriminator = 9 (AssertTokenAccount)
//   [1]    logLevel = 0 (Silent)
//   [2]    assertion variant = 2 (TokenAccountAssertion::Amount)
//   [3-10] amount as u64 LE
//   [11]   operator (3 = LessThan, 0 = Equal, 4 = LessThanOrEqual, …)
function buildLighthouseTokenAccountAmountAssertion(
  amount: number,
  operator: number
): Buffer {
  const buf = Buffer.alloc(12);
  buf.writeUInt8(9, 0); // AssertTokenAccount discriminator
  buf.writeUInt8(0, 1); // LogLevel::Silent
  buf.writeUInt8(2, 2); // TokenAccountAssertion::Amount variant
  buf.writeBigUInt64LE(BigInt(amount), 3);
  buf.writeUInt8(operator, 11);
  return buf;
}

// IntegerOperator constants (from Lighthouse)
const OP_LESS_THAN = 3;

// ── Token Transfer instruction data ──────────────────────────────────────
// The program patches bytes 1-8 with the actual net_input amount.
// The test provides a placeholder that passes byte-range validation.
function buildTokenTransferInstructionData(amount: number): Buffer {
  const buf = Buffer.alloc(9);
  buf.writeUInt8(3, 0); // Token Program Transfer instruction
  buf.writeBigUInt64LE(BigInt(amount), 1);
  return buf;
}

describe("Composable Topup Balance Flow", () => {
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

  const hotWallet = Keypair.generate();
  const coldWallet = Keypair.generate();

  let gatewayPDA: PublicKey;
  let userPaymentPDA: PublicKey;
  let paymentsDelegatePDA: PublicKey;
  let composablePolicyPDA: PublicKey;
  let validationPDA: PublicKey;

  let coldWalletUsdcAta: PublicKey;
  let hotWalletUsdcAta: PublicKey;
  let feeRecipientUsdcAta: PublicKey;
  let adminUsdcAta: PublicKey;

  let composablePolicyId: number;

  beforeAll(async () => {
    surfpool = new SurfpoolHelper(connection);

    const isSurfpool = await surfpool.isSurfpool();
    if (!isSurfpool) {
      throw new Error(
        "Not running against Surfpool. Start with: surfpool start --legacy-anchor-compatibility --no-tui"
      );
    }

    sdk = new TributarySDK(connection, wallet.payer);

    const configAccount = await sdk.getProgramConfig(configPDA);
    configAccount.admin = admin.publicKey;
    const serialized = await program.coder.accounts.encode(
      "programConfig",
      configAccount
    );
    await surfpool.setAccount({
      publicKey: configPDA,
      data: serialized.toString("hex"),
    });

    // Derive PDAs
    gatewayPDA = getGatewayPda(hotWallet.publicKey, program.programId).address;
    userPaymentPDA = getUserPaymentPda(
      coldWallet.publicKey,
      USDC_MINT,
      program.programId
    ).address;
    paymentsDelegatePDA = getPaymentsDelegatePda(program.programId).address;

    // Derive token accounts
    coldWalletUsdcAta = getAssociatedTokenAddressSync(
      USDC_MINT,
      coldWallet.publicKey
    );
    hotWalletUsdcAta = getAssociatedTokenAddressSync(
      USDC_MINT,
      hotWallet.publicKey
    );
    feeRecipientUsdcAta = getAssociatedTokenAddressSync(
      USDC_MINT,
      feeRecipient.publicKey
    );
    adminUsdcAta = getAssociatedTokenAddressSync(USDC_MINT, wallet.publicKey);

    // ── Fund SOL ────────────────────────────────────────────────────────
    await surfpool.setAccount({
      publicKey: hotWallet.publicKey,
      lamports: 10_000_000_000,
    });
    await surfpool.setAccount({
      publicKey: coldWallet.publicKey,
      lamports: 10_000_000_000,
    });
    await surfpool.setAccount({
      publicKey: feeRecipient.publicKey,
      lamports: 1_000_000_000,
    });
    await surfpool.setAccount({
      publicKey: admin.publicKey,
      lamports: 1_000_000_000,
    });

    // ── Fund USDC ───────────────────────────────────────────────────────
    // coldWallet: 1000 USDC with payments_delegate set as delegate (100 USDC delegated)
    await surfpool.setTokenAccount({
      owner: coldWallet.publicKey,
      mint: USDC_MINT,
      amount: 1_000_000_000, // 1000 USDC
      delegate: paymentsDelegatePDA,
      delegatedAmount: 100_000_000, // 100 USDC delegated
    });

    // hotWallet: 40 USDC (below the 50 USDC threshold)
    await surfpool.setTokenAccount({
      owner: hotWallet.publicKey,
      mint: USDC_MINT,
      amount: 40_000_000, // 40 USDC
    });

    // feeRecipient: empty ATA (gateway fee = 0, but account must exist)
    await surfpool.setTokenAccount({
      owner: feeRecipient.publicKey,
      mint: USDC_MINT,
      amount: 0,
    });

    // wallet
    await surfpool.setTokenAccount({
      owner: wallet.publicKey,
      mint: USDC_MINT,
      amount: 0,
    });
  });

  test("create gateway", async () => {
    await sdk.updateWallet(new anchor.Wallet(admin));

    gatewayPDA = getGatewayPda(gatewayAuthority.publicKey, program.programId).address;

    const gatewayIx = await sdk.createPaymentGateway(
      gatewayAuthority.publicKey,
      0, // 0 bps gateway fee — simplifies math
      feeRecipient.publicKey, // fee recipient
      "Gateway",
      "https://tributary.so"
    );
    const tx = new Transaction().add(gatewayIx);

    await sendAndConfirmTransaction(connection, tx, [admin], {
      commitment: "processed",
    });

    const gatewayAccount = await sdk.getPaymentGateway(gatewayPDA);

    expect(gatewayAccount!.authority).toEqual(gatewayAuthority.publicKey);
    expect(gatewayAccount!.feeRecipient).toEqual(feeRecipient.publicKey);
    expect(gatewayAccount!.gatewayFeeBps).toBe(0);
    expect(gatewayAccount!.isActive).toBe(true);
    expect(gatewayAccount!.createdAt.toNumber()).toBeGreaterThan(0);
  });

  test("create hotWallet payment for USDC mint", async () => {
    await sdk.updateWallet(new anchor.Wallet(hotWallet));

    userPaymentPDA = getUserPaymentPda(
      hotWallet.publicKey,
      USDC_MINT,
      program.programId
    ).address;

    const createUserPaymentIx = await sdk.createUserPayment(USDC_MINT);
    const tx = new Transaction().add(createUserPaymentIx);

    await sendAndConfirmTransaction(connection, tx, [hotWallet], {
      commitment: "processed",
    });

    const userPayment = await sdk.getUserPayment(userPaymentPDA);

    expect(userPayment).not.toBeNull();
    expect(userPayment!.owner).toEqual(hotWallet.publicKey);
    expect(userPayment!.tokenMint).toEqual(USDC_MINT);
    expect(userPayment!.createdPoliciesCount).toBe(0);
    expect(userPayment!.isActive).toBe(true);
  });

  test("Create composable topup policy — usage schedule + Lighthouse validation", async () => {
    await sdk.updateWallet(new anchor.Wallet(hotWallet));

    const userPayment = await sdk.getUserPayment(userPaymentPDA);
    composablePolicyId = (userPayment!.createdComposableCount ?? 0) + 1;

    composablePolicyPDA = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    ).address;

    validationPDA = getValidationPda(
      composablePolicyPDA,
      program.programId
    ).address;

    const now = Math.floor(Date.now() / 1000);

    // Usage schedule: 100 USDC/month max, 50 USDC max chunk
    const schedule = {
      usage: {
        maxAmountPerPeriod: new anchor.BN(100_000_000), // 100 USDC
        maxChunkAmount: new anchor.BN(50_000_000), // 50 USDC
        periodLengthSeconds: new anchor.BN(30 * 24 * 3600), // 30 days
        currentPeriodStart: new anchor.BN(now),
        currentPeriodTotal: new anchor.BN(0),
      },
    };

    const memo = new Array(64).fill(0);
    Buffer.from("Topup balance").copy(Buffer.from(memo));

    // Forward to Token Program — byte-range check pins discriminator at byte 0 == 3 (Transfer)
    const forwardConfig = {
      targetProgram: TOKEN_PROGRAM_ID,
      inputMint: USDC_MINT,
      outputMint: USDC_MINT,
      minOutputAmount: null,
      forwardFlags: 0,
      numDataChecks: 1,
      dataChecks: [
        { offset: 0, length: 1, expected: [3, 0, 0, 0, 0, 0, 0, 0] },
        { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
        { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
        { offset: 0, length: 0, expected: [0, 0, 0, 0, 0, 0, 0, 0] },
      ],
    };

    // Lighthouse validation: assert hotWallet USDC amount < 50 USDC
    const validationData = buildLighthouseTokenAccountAmountAssertion(
      50_000_000, // 50 USDC threshold
      OP_LESS_THAN
    );

    // numValidationAccounts = 1 (hotWallet USDC ATA — the account Lighthouse reads)
    const ix = await program.methods
      .createComposablePolicy(
        schedule,
        memo,
        forwardConfig,
        LIGHTHOUSE_PUBKEY,
        1, // numValidationAccounts
        validationData
      )
      .accountsStrict({
        feePayer: hotWallet.publicKey,
        user: hotWallet.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        validationPda: validationPDA,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(ix),
      [hotWallet],
      { commitment: "processed" }
    );

    // ── Verify policy was created correctly ─────────────────────────────
    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );

    expect(policy.discriminator).toBe(1);
    expect(policy.version).toBe(1);
    expect(policy.userPayment).toEqual(userPaymentPDA);
    expect(policy.gateway).toEqual(gatewayPDA);
    expect(policy.status).toEqual({ active: {} });
    expect(policy.policyId).toBe(composablePolicyId);

    // Recipient defaults to fee_payer (gateway signer = hotWallet)
    expect(policy.recipient).toEqual(hotWallet.publicKey);

    // Forward config
    expect(policy.forwardConfig.targetProgram).toEqual(TOKEN_PROGRAM_ID);
    expect(policy.forwardConfig.inputMint).toEqual(USDC_MINT);
    expect(policy.forwardConfig.numDataChecks).toBe(1);

    // Validation config
    expect(policy.validationConfig.validationProgram).toEqual(
      LIGHTHOUSE_PUBKEY
    );
    expect(policy.validationConfig.numValidationAccounts).toBe(1);

    // Usage schedule
    expect(policy.schedule.usage.maxAmountPerPeriod.toNumber()).toBe(
      100_000_000
    );
    expect(policy.schedule.usage.maxChunkAmount.toNumber()).toBe(50_000_000);
    expect(policy.schedule.usage.currentPeriodTotal.toNumber()).toBe(0);

    // Verify ValidationPDA was created with correct assertion data
    const valPdaAccount = await connection.getAccountInfo(validationPDA);
    expect(valPdaAccount).not.toBeNull();
    const dataLen = valPdaAccount!.data.readUInt16LE(8);
    expect(dataLen).toBe(12);
    const storedData = valPdaAccount!.data.slice(10, 10 + 12);
    expect(Buffer.from(storedData)).toEqual(validationData);
  });

  test("Execute topup — succeeds (hotWallet below threshold)", async () => {
    await sdk.updateWallet(new anchor.Wallet(hotWallet));

    // Pre-execution balance check
    const hotBalanceBefore = await connection.getTokenAccountBalance(
      hotWalletUsdcAta
    );
    expect(hotBalanceBefore.value.uiAmount).toBe(40);

    // Build instruction data: Token Transfer (byte 0 = 3)
    // The program patches the amount in bytes 1-8; placeholder is fine.
    const instructionData = buildTokenTransferInstructionData(50_000_000);

    // Derive intermediate ATA (owned by composable_policy PDA)
    const intermediate_input_token_account = getAssociatedTokenAddressSync(
      USDC_MINT,
      composablePolicyPDA,
      true, // allowOwnerOffCurve (PDA)
      TOKEN_PROGRAM_ID
    );

    // remaining_accounts: [ValidationPDA, hotWalletUsdcAta]
    // The Lighthouse CPI reads hotWalletUsdcAta to assert amount < 50 USDC.
    const remainingAccounts = [
      { pubkey: validationPDA, isSigner: false, isWritable: false },
      { pubkey: hotWalletUsdcAta, isSigner: false, isWritable: false },
    ];

    const ix = await program.methods
      .executeComposable(instructionData, new anchor.BN(50_000_000))
      .accountsStrict({
        feePayer: hotWallet.publicKey,
        paymentsDelegate: paymentsDelegatePDA,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        userTokenAccount: coldWalletUsdcAta,
        mint: USDC_MINT,
        outputMint: USDC_MINT,
        intermediateInputTokenAccount: intermediate_input_token_account,
        intermediateOutputTokenAccount: intermediate_input_token_account,
        recipientTokenAccount: hotWalletUsdcAta,
        gatewayFeeAccount: feeRecipientUsdcAta,
        protocolFeeAccount: adminUsdcAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(ix),
      [hotWallet],
      { commitment: "processed" }
    );

    // ── Fee calculation ─────────────────────────────────────────────────
    const config = await program.account.programConfig.fetch(configPDA);
    const protocolFeeBps = config.protocolFeeBps;
    const gateway = await program.account.paymentGateway.fetch(gatewayPDA);
    const gatewayFeeBps = gateway.gatewayFeeBps;

    const inputAmount = 50_000_000;
    const gatewayFee = Math.floor((inputAmount * gatewayFeeBps) / 10000);
    const protocolFee = Math.floor((inputAmount * protocolFeeBps) / 10000);
    const netInput = inputAmount - gatewayFee - protocolFee;
    const expectedHotWalletBalance = 40_000_000 + netInput;

    // ── Verify balances ────────────────────────────────────────────────
    const hotBalanceAfter = await connection.getTokenAccountBalance(
      hotWalletUsdcAta
    );
    expect(Number(hotBalanceAfter.value.amount)).toBe(expectedHotWalletBalance);

    const coldBalanceAfter = await connection.getTokenAccountBalance(
      coldWalletUsdcAta
    );
    expect(Number(coldBalanceAfter.value.amount)).toBe(
      1_000_000_000 - inputAmount
    );

    // Protocol fee account should have received the fee
    const adminBalanceAfter = await connection.getTokenAccountBalance(
      adminUsdcAta
    );
    expect(Number(adminBalanceAfter.value.amount)).toBe(protocolFee);

    // Gateway fee = 0, so feeRecipient gets nothing
    const feeRecipientBalance = await connection.getTokenAccountBalance(
      feeRecipientUsdcAta
    );
    expect(Number(feeRecipientBalance.value.amount)).toBe(0);

    // ── Verify policy state ─────────────────────────────────────────────
    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.totalInput.toNumber()).toBe(inputAmount);
    expect(policy.totalOutput.toNumber()).toBe(netInput);
    expect(policy.paymentCount).toBe(1);
    expect(policy.schedule.usage.currentPeriodTotal.toNumber()).toBe(
      inputAmount
    );
  });

  // ══════════════════════════════════════════════════════════════════════
  //  3. Execute topup again — fails (hotWallet balance now > 50 threshold)
  // ══════════════════════════════════════════════════════════════════════
  test("Execute topup again — fails (hotWallet above threshold)", async () => {
    await sdk.updateWallet(new anchor.Wallet(hotWallet));

    // hotWallet should now have ~89.5 USDC (> 50 USDC threshold)
    const hotBalance = await connection.getTokenAccountBalance(
      hotWalletUsdcAta
    );
    expect(Number(hotBalance.value.amount)).toBeGreaterThan(50_000_000);

    const instructionData = buildTokenTransferInstructionData(50_000_000);

    // Derive intermediate ATA (same as first execution)
    const intermediate_input_token_account = getAssociatedTokenAddressSync(
      USDC_MINT,
      composablePolicyPDA,
      true,
      TOKEN_PROGRAM_ID
    );

    const remainingAccounts = [
      { pubkey: validationPDA, isSigner: false, isWritable: false },
      { pubkey: hotWalletUsdcAta, isSigner: false, isWritable: false },
    ];

    try {
      const ix = await program.methods
        .executeComposable(instructionData, new anchor.BN(50_000_000))
        .accountsStrict({
          feePayer: hotWallet.publicKey,
          paymentsDelegate: paymentsDelegatePDA,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          userTokenAccount: coldWalletUsdcAta,
          mint: USDC_MINT,
          outputMint: USDC_MINT,
          intermediateInputTokenAccount: intermediate_input_token_account,
          intermediateOutputTokenAccount: intermediate_input_token_account,
          recipientTokenAccount: hotWalletUsdcAta,
          gatewayFeeAccount: feeRecipientUsdcAta,
          protocolFeeAccount: adminUsdcAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [hotWallet],
        { commitment: "processed" }
      );

      assert(false, "Expected Lighthouse validation to fail");
    } catch (error: any) {
      // Lighthouse assertion fails because hotWallet balance (89.5 USDC)
      // is NOT less than 50 USDC.
      expect(error).toBeDefined();
    }

    // ── Verify policy state unchanged (transaction reverted) ────────────
    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.paymentCount).toBe(1);
    expect(policy.schedule.usage.currentPeriodTotal.toNumber()).toBe(
      50_000_000
    );
  });
});
