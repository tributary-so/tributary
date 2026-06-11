import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Commitment,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import {
  createMint,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccount,
  mintTo,
  approve,
} from "@solana/spl-token";
import { Tributary } from "../target/types/tributary";
import { SEEDS, IWallet, Tributary as TributarySDK } from "../packages/sdk/src";
import assert = require("assert");
import { Buffer } from "buffer";

// ── Whitelisted program pubkeys from on-chain constants.rs ──────────────
// Meteora DLMM: Pubkey::new_from_array([4, 233, ...])
const METEORA_DLMM_PUBKEY = new PublicKey(
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
);
// Lighthouse: Pubkey::new_from_array([27, 132, ...])
const LIGHTHOUSE_PUBKEY = new PublicKey(
  "2rQnHupkzPLnMpEKiL4YknBTPQJiNvECzkRCucYHC4UM"
);

// ── Composable Policy PDA helper ────────────────────────────────────────
function getComposablePolicyPda(
  userPayment: PublicKey,
  policyId: number,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.COMPOSABLE_POLICY),
      userPayment.toBuffer(),
      new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
    ],
    programId
  );
}

// ── Default helpers ─────────────────────────────────────────────────────
function defaultByteRangeChecks(): any[] {
  // 4 ByteRangeCheck slots — first one is a discriminator check at offset 0
  return [
    { offset: 0, length: 8, expected: new Array(8).fill(0) },
    { offset: 0, length: 0, expected: new Array(8).fill(0) },
    { offset: 0, length: 0, expected: new Array(8).fill(0) },
    { offset: 0, length: 0, expected: new Array(8).fill(0) },
  ];
}

function defaultForwardConfig(
  inputMint: PublicKey,
  outputMint: PublicKey
): any {
  return {
    targetProgram: METEORA_DLMM_PUBKEY,
    inputMint: inputMint,
    outputMint: outputMint,
    minOutputAmount: null,
    forwardFlags: 0,
    numDataChecks: 1,
    dataChecks: defaultByteRangeChecks(),
  };
}

function defaultValidationConfig(): any {
  return {
    validationProgram: PublicKey.default,
    numValidationAccounts: 0,
    validationDataLen: 0,
    validationData: new Array(128).fill(0),
  };
}

function defaultTimedSchedule(amount: number, nextDue: number): any {
  return {
    timed: {
      amount: new anchor.BN(amount),
      autoRenew: true,
      maxExecutions: null,
      frequency: { monthly: {} },
      nextExecutionDue: new anchor.BN(nextDue),
    },
  };
}

describe("Composable Policies", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.tributary as anchor.Program<Tributary>;
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  let sdk: TributarySDK;

  // ── Keypairs ──────────────────────────────────────────────────────────
  let admin: Keypair;
  let user: Keypair;
  let mintAuthority: Keypair;
  let gatewayAuthority: Keypair;
  let feeRecipient: Keypair;

  // ── PDAs / shared state ───────────────────────────────────────────────
  let configPDA: PublicKey;
  let tokenMint: PublicKey;
  let secondMint: PublicKey; // different mint for output
  let userTokenAccount: PublicKey;
  let gatewayPDA: PublicKey;
  let userPaymentPDA: PublicKey;
  let paymentsDelegate: PublicKey;
  let gatewaySignerTokenAccount: PublicKey; // token account for gateway signer (= recipient in composable)

  async function fund(account: PublicKey, amount: number): Promise<void> {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: account,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(tx, null, {
      commitment: "processed" as Commitment,
    });
  }

  beforeAll(async () => {
    sdk = new TributarySDK(connection, wallet as IWallet);

    admin = Keypair.generate();
    user = Keypair.generate();
    mintAuthority = Keypair.generate();
    gatewayAuthority = Keypair.generate();
    feeRecipient = Keypair.generate();

    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    await Promise.all([
      fund(admin.publicKey, 10),
      fund(user.publicKey, 10),
      fund(mintAuthority.publicKey, 10),
      fund(gatewayAuthority.publicKey, 10),
      fund(feeRecipient.publicKey, 1),
    ]);

    // Create two token mints (input & output)
    tokenMint = await createMint(
      connection,
      mintAuthority,
      mintAuthority.publicKey,
      null,
      6
    );
    secondMint = await createMint(
      connection,
      mintAuthority,
      mintAuthority.publicKey,
      null,
      6
    );

    // User token account (input mint)
    userTokenAccount = getAssociatedTokenAddressSync(tokenMint, user.publicKey);
    await createAssociatedTokenAccount(
      connection,
      admin,
      tokenMint,
      user.publicKey
    );
    await mintTo(
      connection,
      mintAuthority,
      tokenMint,
      userTokenAccount,
      mintAuthority,
      BigInt(100_000_000) // 100 tokens
    );

    // Gateway PDA
    [gatewayPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("gateway"), gatewayAuthority.publicKey.toBuffer()],
      program.programId
    );

    // User payment PDA
    [userPaymentPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_payment"),
        user.publicKey.toBuffer(),
        tokenMint.toBuffer(),
      ],
      program.programId
    );

    // Payments delegate PDA
    [paymentsDelegate] = PublicKey.findProgramAddressSync(
      [Buffer.from("payments")],
      program.programId
    );

    // Recipient token account — for composable, recipient = gateway signer
    gatewaySignerTokenAccount = await createAssociatedTokenAccount(
      connection,
      admin,
      tokenMint,
      gatewayAuthority.publicKey
    );

    // Fee recipient token accounts
    await createAssociatedTokenAccount(
      connection,
      admin,
      tokenMint,
      feeRecipient.publicKey
    );
    await createAssociatedTokenAccount(
      connection,
      admin,
      tokenMint,
      admin.publicKey
    );
  });

  // ── Bootstrap: init program, create user payment, create gateway ──────
  beforeAll(async () => {
    // Init program
    await sdk.updateWallet(new anchor.Wallet(admin));
    const initIx = await sdk.initialize(admin.publicKey);
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(initIx),
      [admin],
      { commitment: "processed" as Commitment }
    );

    // Create user payment
    await sdk.updateWallet(new anchor.Wallet(user));
    const createUserIx = await sdk.createUserPayment(tokenMint);
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createUserIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    // Create gateway
    await sdk.updateWallet(new anchor.Wallet(admin));
    const gatewayIx = await sdk.createPaymentGateway(
      gatewayAuthority.publicKey,
      250, // 2.5% fee
      feeRecipient.publicKey,
      "composable test gateway",
      "https://test.tributary.so"
    );
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(gatewayIx),
      [admin],
      { commitment: "processed" as Commitment }
    );
  });

  // ══════════════════════════════════════════════════════════════════════
  //  1. Create composable policy — timed schedule, no validation
  // ══════════════════════════════════════════════════════════════════════
  test("Create composable policy — timed schedule, no validation", async () => {
    // Use gateway signer as fee_payer (required by the program)
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composableCountBefore =
      userPaymentBefore!.createdComposableCount ?? 0;

    const now = Math.floor(Date.now() / 1000);
    const nextDue = now + 30 * 24 * 3600; // 30 days from now
    const schedule = defaultTimedSchedule(1_000_000, nextDue);
    const memo = new Array(64).fill(0);
    Buffer.from("Test composable").copy(Buffer.from(memo));

    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
    const validationConfig = defaultValidationConfig();

    const composablePolicyId = composableCountBefore + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const ix = await program.methods
      .createComposablePolicy(schedule, memo, forwardConfig, validationConfig)
      .accountsStrict({
        feePayer: gatewayAuthority.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(ix),
      [gatewayAuthority],
      { commitment: "processed" as Commitment }
    );

    // Verify account data
    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );

    expect(policy.discriminator).toBe(1);
    expect(policy.version).toBe(1);
    expect(policy.userPayment).toEqual(userPaymentPDA);
    expect(policy.gateway).toEqual(gatewayPDA);
    expect(policy.status).toEqual({ active: {} });
    expect(policy.policyId).toBe(composablePolicyId);
    expect(policy.totalInput.toNumber()).toBe(0);
    expect(policy.totalOutput.toNumber()).toBe(0);
    expect(policy.paymentCount).toBe(0);
    expect(policy.forwardConfig.targetProgram).toEqual(METEORA_DLMM_PUBKEY);
    expect(policy.forwardConfig.numDataChecks).toBe(1);
    expect(policy.validationConfig.validationProgram).toEqual(
      PublicKey.default
    );

    // Verify schedule stored correctly
    expect(policy.schedule.timed.amount.toNumber()).toBe(1_000_000);
    expect(policy.schedule.timed.autoRenew).toBe(true);
    expect(policy.schedule.timed.maxExecutions).toBeNull();

    // Verify user_payment counters
    const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
    expect(userPaymentAfter!.createdComposableCount).toBe(composablePolicyId);
    expect(userPaymentAfter!.activeComposableCount).toBe(
      (userPaymentBefore!.activeComposableCount ?? 0) + 1
    );
  });

  // ══════════════════════════════════════════════════════════════════════
  //  2. Create composable policy — with validation config
  // ══════════════════════════════════════════════════════════════════════
  test("Create composable policy — with validation config", async () => {
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    const schedule = defaultTimedSchedule(500_000, now + 86400);

    const memo = new Array(64).fill(0);
    Buffer.from("With validation").copy(Buffer.from(memo));

    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);

    // Lighthouse as validation program with some data
    const validationData = new Array(128).fill(0);
    Buffer.from("lighthouse-assert-data").copy(Buffer.from(validationData));

    const validationConfig = {
      validationProgram: LIGHTHOUSE_PUBKEY,
      numValidationAccounts: 1,
      validationDataLen: 24,
      validationData: validationData,
    };

    const ix = await program.methods
      .createComposablePolicy(schedule, memo, forwardConfig, validationConfig)
      .accountsStrict({
        feePayer: gatewayAuthority.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(ix),
      [gatewayAuthority],
      { commitment: "processed" as Commitment }
    );

    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );

    expect(policy.validationConfig.validationProgram).toEqual(
      LIGHTHOUSE_PUBKEY
    );
    expect(policy.validationConfig.numValidationAccounts).toBe(1);
    expect(policy.validationConfig.validationDataLen).toBe(24);
    expect(policy.status).toEqual({ active: {} });
  });

  // ══════════════════════════════════════════════════════════════════════
  //  3. Create composable policy — fails with non-whitelisted forward program
  // ══════════════════════════════════════════════════════════════════════
  test("Create composable policy — fails with non-whitelisted forward program", async () => {
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    const schedule = defaultTimedSchedule(100_000, now + 86400);
    const memo = new Array(64).fill(0);

    // Random non-whitelisted pubkey
    const rogueProgram = Keypair.generate().publicKey;
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
    forwardConfig.targetProgram = rogueProgram;

    const validationConfig = defaultValidationConfig();

    try {
      const ix = await program.methods
        .createComposablePolicy(schedule, memo, forwardConfig, validationConfig)
        .accountsStrict({
          feePayer: gatewayAuthority.publicKey,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [gatewayAuthority],
        { commitment: "processed" as Commitment }
      );

      assert(false, "Expected error for non-whitelisted forward program");
    } catch (error: any) {
      expect(error.message).toContain("InvalidForwardProgram");
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  //  4. Create composable policy — fails with non-whitelisted validation program
  // ══════════════════════════════════════════════════════════════════════
  test("Create composable policy — fails with non-whitelisted validation program", async () => {
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    const schedule = defaultTimedSchedule(100_000, now + 86400);
    const memo = new Array(64).fill(0);
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);

    // Random non-whitelisted validation program (not default and not Lighthouse)
    const rogueValidation = Keypair.generate().publicKey;
    const validationConfig = {
      validationProgram: rogueValidation,
      numValidationAccounts: 0,
      validationDataLen: 0,
      validationData: new Array(128).fill(0),
    };

    try {
      const ix = await program.methods
        .createComposablePolicy(schedule, memo, forwardConfig, validationConfig)
        .accountsStrict({
          feePayer: gatewayAuthority.publicKey,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [gatewayAuthority],
        { commitment: "processed" as Commitment }
      );

      assert(false, "Expected error for non-whitelisted validation program");
    } catch (error: any) {
      expect(error.message).toContain("InvalidValidationProgram");
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  //  5. Create composable policy — fails with zero data checks
  // ══════════════════════════════════════════════════════════════════════
  test("Create composable policy — fails with zero data checks", async () => {
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    const schedule = defaultTimedSchedule(100_000, now + 86400);
    const memo = new Array(64).fill(0);

    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
    forwardConfig.numDataChecks = 0; // INVALID: must be >= 1

    const validationConfig = defaultValidationConfig();

    try {
      const ix = await program.methods
        .createComposablePolicy(schedule, memo, forwardConfig, validationConfig)
        .accountsStrict({
          feePayer: gatewayAuthority.publicKey,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [gatewayAuthority],
        { commitment: "processed" as Commitment }
      );

      assert(false, "Expected error for zero data checks");
    } catch (error: any) {
      expect(error.message).toContain("InsufficientByteRangeChecks");
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  //  7. Change composable status — Active to Paused
  // ══════════════════════════════════════════════════════════════════════
  test("Change composable status — Active to Paused", async () => {
    // First create a fresh composable policy for this test
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    const schedule = defaultTimedSchedule(100_000, now + 86400);
    const memo = new Array(64).fill(0);
    Buffer.from("Status test").copy(Buffer.from(memo));
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
    const validationConfig = defaultValidationConfig();

    // Create
    const createIx = await program.methods
      .createComposablePolicy(schedule, memo, forwardConfig, validationConfig)
      .accountsStrict({
        feePayer: gatewayAuthority.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createIx),
      [gatewayAuthority],
      { commitment: "processed" as Commitment }
    );

    // Verify Active
    let policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.status).toEqual({ active: {} });

    // Pause — owner (user) signs
    await sdk.updateWallet(new anchor.Wallet(user));

    const pauseIx = await program.methods
      .changeComposableStatus(composablePolicyId, { paused: {} })
      .accountsStrict({
        owner: user.publicKey,
        userPayment: userPaymentPDA,
        composablePolicy: composablePolicyPDA,
        gateway: gatewayPDA,
        config: configPDA,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(pauseIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    policy = await program.account.composablePolicy.fetch(composablePolicyPDA);
    expect(policy.status).toEqual({ paused: {} });
  });

  // ══════════════════════════════════════════════════════════════════════
  //  8. Change composable status — Paused to Active
  // ══════════════════════════════════════════════════════════════════════
  test("Change composable status — Paused to Active", async () => {
    // Reuse the paused policy from the previous test
    const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId = userPaymentAfter!.createdComposableCount;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    // Verify it's paused
    let policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.status).toEqual({ paused: {} });

    // Resume — owner (user) signs
    await sdk.updateWallet(new anchor.Wallet(user));

    const resumeIx = await program.methods
      .changeComposableStatus(composablePolicyId, { active: {} })
      .accountsStrict({
        owner: user.publicKey,
        userPayment: userPaymentPDA,
        composablePolicy: composablePolicyPDA,
        gateway: gatewayPDA,
        config: configPDA,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(resumeIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    policy = await program.account.composablePolicy.fetch(composablePolicyPDA);
    expect(policy.status).toEqual({ active: {} });
  });

  // ══════════════════════════════════════════════════════════════════════
  //  6. Delete composable policy
  // ══════════════════════════════════════════════════════════════════════
  test("Delete composable policy", async () => {
    // Create a new policy, pause it, then delete it
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );
    const activeBefore = userPaymentBefore!.activeComposableCount ?? 0;

    const now = Math.floor(Date.now() / 1000);
    const schedule = defaultTimedSchedule(50_000, now + 86400);
    const memo = new Array(64).fill(0);
    Buffer.from("Delete test").copy(Buffer.from(memo));
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
    const validationConfig = defaultValidationConfig();

    // Create
    const createIx = await program.methods
      .createComposablePolicy(schedule, memo, forwardConfig, validationConfig)
      .accountsStrict({
        feePayer: gatewayAuthority.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createIx),
      [gatewayAuthority],
      { commitment: "processed" as Commitment }
    );

    // Verify it's Active, then pause
    let policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.status).toEqual({ active: {} });

    // Pause first (can only delete non-Active policies)
    await sdk.updateWallet(new anchor.Wallet(user));

    const pauseIx = await program.methods
      .changeComposableStatus(composablePolicyId, { paused: {} })
      .accountsStrict({
        owner: user.publicKey,
        userPayment: userPaymentPDA,
        composablePolicy: composablePolicyPDA,
        gateway: gatewayPDA,
        config: configPDA,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(pauseIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    // Now delete
    const deleteIx = await program.methods
      .deleteComposablePolicy(composablePolicyId)
      .accountsStrict({
        owner: user.publicKey,
        userPayment: userPaymentPDA,
        composablePolicy: composablePolicyPDA,
        config: configPDA,
        rentPayer: gatewayAuthority.publicKey, // was fee_payer at creation
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(deleteIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    // Verify account closed
    const policyAfter = await program.account.composablePolicy.fetchNullable(
      composablePolicyPDA
    );
    expect(policyAfter).toBeNull();

    // Verify active_composable_count decremented
    const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
    expect(userPaymentAfter!.activeComposableCount).toBe(activeBefore);
  });

  // ══════════════════════════════════════════════════════════════════════
  //  9. Execute composable — byte range check fails
  // ══════════════════════════════════════════════════════════════════════
  test("Execute composable — byte range check fails", async () => {
    // Create a composable policy with a specific byte-range check
    // then attempt to execute with instruction_data that doesn't match
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    // Set up a schedule that is due now (start in the past)
    const pastTime = Math.floor(Date.now() / 1000) - 3600;
    const schedule = defaultTimedSchedule(100_000, pastTime);

    const memo = new Array(64).fill(0);
    Buffer.from("ByteCheck test").copy(Buffer.from(memo));

    // Byte-range check: offset 0, length 8, expected [1,2,3,4,5,6,7,8]
    const expectedBytes = [1, 2, 3, 4, 5, 6, 7, 8];
    const dataChecks = defaultByteRangeChecks();
    dataChecks[0] = {
      offset: 0,
      length: 8,
      expected: expectedBytes,
    };

    const forwardConfig = {
      targetProgram: METEORA_DLMM_PUBKEY,
      inputMint: tokenMint,
      outputMint: secondMint,
      minOutputAmount: null,
      forwardFlags: 0,
      numDataChecks: 1,
      dataChecks: dataChecks,
    };

    const validationConfig = defaultValidationConfig();

    // Create policy
    const createIx = await program.methods
      .createComposablePolicy(schedule, memo, forwardConfig, validationConfig)
      .accountsStrict({
        feePayer: gatewayAuthority.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createIx),
      [gatewayAuthority],
      { commitment: "processed" as Commitment }
    );

    // Set up token delegation
    await approve(
      connection,
      user,
      userTokenAccount,
      paymentsDelegate,
      user,
      10_000_000 // 10 tokens
    );

    // Attempt execution with WRONG instruction_data
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    // Wrong data: all zeros instead of [1,2,3,4,5,6,7,8]
    const wrongInstructionData = Buffer.from(new Array(32).fill(0));

    try {
      const ix = await program.methods
        .executeComposable(wrongInstructionData, null)
        .accountsStrict({
          feePayer: gatewayAuthority.publicKey,
          paymentsDelegate: paymentsDelegate,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          userTokenAccount: userTokenAccount,
          mint: tokenMint,
          recipientTokenAccount: gatewaySignerTokenAccount,
          gatewayFeeAccount: getAssociatedTokenAddressSync(
            tokenMint,
            feeRecipient.publicKey
          ),
          protocolFeeAccount: getAssociatedTokenAddressSync(
            tokenMint,
            admin.publicKey
          ),
          tokenProgram: new PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          ),
          associatedTokenProgram: new PublicKey(
            "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
          ),
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [gatewayAuthority],
        { commitment: "processed" as Commitment }
      );

      assert(false, "Expected ByteRangeCheckFailed error");
    } catch (error: any) {
      expect(error.message).toContain("ByteRangeCheckFailed");
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  //  10. Execute composable — paused policy fails
  // ══════════════════════════════════════════════════════════════════════
  test("Execute composable — paused policy fails", async () => {
    // Create a new policy, pause it, then attempt execution
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const pastTime = Math.floor(Date.now() / 1000) - 3600;
    const schedule = defaultTimedSchedule(100_000, pastTime);

    const memo = new Array(64).fill(0);
    Buffer.from("Paused exec test").copy(Buffer.from(memo));
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
    const validationConfig = defaultValidationConfig();

    // Create
    const createIx = await program.methods
      .createComposablePolicy(schedule, memo, forwardConfig, validationConfig)
      .accountsStrict({
        feePayer: gatewayAuthority.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createIx),
      [gatewayAuthority],
      { commitment: "processed" as Commitment }
    );

    // Pause it
    await sdk.updateWallet(new anchor.Wallet(user));

    const pauseIx = await program.methods
      .changeComposableStatus(composablePolicyId, { paused: {} })
      .accountsStrict({
        owner: user.publicKey,
        userPayment: userPaymentPDA,
        composablePolicy: composablePolicyPDA,
        gateway: gatewayPDA,
        config: configPDA,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(pauseIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    // Attempt execution on paused policy — should fail at the account validation stage
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    try {
      const ix = await program.methods
        .executeComposable(Buffer.from(new Array(32).fill(0)), null)
        .accountsStrict({
          feePayer: gatewayAuthority.publicKey,
          paymentsDelegate: paymentsDelegate,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          userTokenAccount: userTokenAccount,
          mint: tokenMint,
          recipientTokenAccount: gatewaySignerTokenAccount,
          gatewayFeeAccount: getAssociatedTokenAddressSync(
            tokenMint,
            feeRecipient.publicKey
          ),
          protocolFeeAccount: getAssociatedTokenAddressSync(
            tokenMint,
            admin.publicKey
          ),
          tokenProgram: new PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          ),
          associatedTokenProgram: new PublicKey(
            "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
          ),
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [gatewayAuthority],
        { commitment: "processed" as Commitment }
      );

      assert(false, "Expected PolicyPaused error");
    } catch (error: any) {
      expect(error.message).toContain("PolicyPaused");
    }
  });
});
