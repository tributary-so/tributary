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
  createAssociatedTokenAccountIdempotent,
  mintTo,
  approve,
} from "@solana/spl-token";
import { Tributary } from "../target/types/tributary";
import { SEEDS, IWallet, Tributary as TributarySDK } from "../packages/sdk/src";
import assert from "assert";
import { Buffer } from "buffer";

const METEORA_DLMM_PUBKEY = new PublicKey(
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
);
const LIGHTHOUSE_PUBKEY = new PublicKey(
  "L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95"
);
const ADMIN_KEYPAIR = [
  238, 31, 185, 140, 54, 107, 145, 78, 166, 97, 25, 234, 169, 89, 102, 11, 16,
  50, 119, 229, 213, 144, 251, 250, 231, 231, 38, 93, 42, 152, 13, 182, 86, 67,
  104, 166, 174, 90, 212, 150, 51, 38, 47, 161, 242, 15, 132, 164, 55, 200, 136,
  167, 125, 249, 228, 30, 132, 100, 67, 255, 185, 242, 47, 145,
];

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

function getValidationPda(
  composablePolicy: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.VALIDATION_PDA), composablePolicy.toBuffer()],
    programId
  );
}

function defaultByteRangeChecks(): any[] {
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

function defaultSubscriptionPolicy(amount: number, nextDue: number): any {
  return {
    subscription: {
      amount: new anchor.BN(amount),
      autoRenew: true,
      maxRenewals: null,
      paymentFrequency: { monthly: {} },
      nextPaymentDue: new anchor.BN(nextDue),
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
  const admin = Keypair.fromSecretKey(Uint8Array.from(ADMIN_KEYPAIR));
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
  let userSecondMintTokenAccount: PublicKey; // token account for gateway signer (= recipient in composable) — OUTPUT mint
  let gatewaySignerInputTokenAccount: PublicKey; // token account for gateway signer — INPUT mint (still used for some setups)

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
    await createAssociatedTokenAccountIdempotent(
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

    // Recipient token account (OUTPUT mint = secondMint) — receives swept output
    userSecondMintTokenAccount = await createAssociatedTokenAccountIdempotent(
      connection,
      admin,
      secondMint,
      gatewayAuthority.publicKey
    );

    // Also create an INPUT-mint account for the gateway signer (used by some
    // older assertions / funding paths; harmless to keep around).
    gatewaySignerInputTokenAccount =
      await createAssociatedTokenAccountIdempotent(
        connection,
        admin,
        tokenMint,
        gatewayAuthority.publicKey
      );

    // Fee recipient token accounts — both INPUT and OUTPUT mint, since the
    // new flow takes fees from the OUTPUT (secondMint), but legacy code paths
    // and other tests may still reference input-mint fee accounts.
    await createAssociatedTokenAccountIdempotent(
      connection,
      admin,
      tokenMint,
      feeRecipient.publicKey
    );
    await createAssociatedTokenAccountIdempotent(
      connection,
      admin,
      secondMint,
      feeRecipient.publicKey
    );
    await createAssociatedTokenAccountIdempotent(
      connection,
      admin,
      tokenMint,
      admin.publicKey
    );
    await createAssociatedTokenAccountIdempotent(
      connection,
      admin,
      secondMint,
      admin.publicKey
    );
  });

  // ── Bootstrap: init program, create user payment, create gateway ──────
  beforeAll(async () => {
    try {
      // Init program
      await sdk.updateWallet(new anchor.Wallet(admin));
      const initIx = await sdk.initialize(
        provider.wallet.publicKey,
        admin.publicKey
      );
      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(initIx),
        [provider.wallet.payer!, admin],
        { commitment: "processed" as Commitment }
      );
    } catch {
      // might fail if we already did all of this through tributary.test
    }

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
  //  1. Create composable policy — subscription policy, no validation
  // ══════════════════════════════════════════════════════════════════════
  test("Create composable policy — subscription policy, no validation", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composableCountBefore =
      userPaymentBefore!.createdComposableCount ?? 0;

    const now = Math.floor(Date.now() / 1000);
    const nextDue = now + 30 * 24 * 3600;
    const policyType = defaultSubscriptionPolicy(1_000_000, nextDue);
    const memo = new Array(64).fill(0);
    Buffer.from("Test composable").copy(Buffer.from(memo));

    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);

    const composablePolicyId = composableCountBefore + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [validationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId
    );

    const ix = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        0,
        Buffer.alloc(0)
      )
      .accountsStrict({
        feePayer: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        validationPda: validationPdaAddress,
        validationProgram: PublicKey.default,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(ix),
      [user],
      { commitment: "processed" as Commitment }
    );

    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );

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

    expect(policy.policyType.subscription.amount.toNumber()).toBe(1_000_000);
    expect(policy.policyType.subscription.autoRenew).toBe(true);
    expect(policy.policyType.subscription.maxRenewals).toBeNull();

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
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [validationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    const policyType = defaultSubscriptionPolicy(500_000, now + 86400);

    const memo = new Array(64).fill(0);
    Buffer.from("With validation").copy(Buffer.from(memo));

    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);

    const validationData = Buffer.from("lighthouse-assert-data");

    const ix = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        1,
        validationData
      )
      .accountsStrict({
        feePayer: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        validationPda: validationPdaAddress,
        validationProgram: LIGHTHOUSE_PUBKEY,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(ix),
      [user],
      { commitment: "processed" as Commitment }
    );

    const policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );

    expect(policy.validationConfig.validationProgram).toEqual(
      LIGHTHOUSE_PUBKEY
    );
    expect(policy.validationConfig.numValidationAccounts).toBe(1);
    expect(policy.status).toEqual({ active: {} });

    // Verify ValidationPDA was created with correct data
    const validationPdaAccount = await connection.getAccountInfo(
      validationPdaAddress
    );
    expect(validationPdaAccount).not.toBeNull();
    // Data layout: 8 (discriminator) + 2 (data_len u16) + data
    const dataLen = validationPdaAccount!.data.readUInt16LE(8);
    expect(dataLen).toBe(validationData.length);
    const storedData = validationPdaAccount!.data.slice(
      10,
      10 + validationData.length
    );
    expect(Buffer.from(storedData)).toEqual(validationData);
  });

  // ══════════════════════════════════════════════════════════════════════
  //  3. Create composable policy — fails with non-whitelisted forward program
  // ══════════════════════════════════════════════════════════════════════
  test("Create composable policy — fails with non-whitelisted forward program", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [validationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    const policyType = defaultSubscriptionPolicy(100_000, now + 86400);
    const memo = new Array(64).fill(0);

    const rogueProgram = Keypair.generate().publicKey;
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
    forwardConfig.targetProgram = rogueProgram;

    try {
      const ix = await program.methods
        .createComposablePolicy(
          policyType,
          memo,
          forwardConfig,
          0,
          Buffer.alloc(0)
        )
        .accountsStrict({
          feePayer: user.publicKey,
          user: user.publicKey,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          validationPda: validationPdaAddress,
          validationProgram: PublicKey.default,
          inputMint: tokenMint,
          outputMint: secondMint,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [user],
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
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [validationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    const policyType = defaultSubscriptionPolicy(100_000, now + 86400);
    const memo = new Array(64).fill(0);
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);

    const rogueValidation = Keypair.generate().publicKey;

    try {
      const ix = await program.methods
        .createComposablePolicy(
          policyType,
          memo,
          forwardConfig,
          0,
          Buffer.from("some-data")
        )
        .accountsStrict({
          feePayer: user.publicKey,
          user: user.publicKey,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          validationPda: validationPdaAddress,
          validationProgram: rogueValidation,
          inputMint: tokenMint,
          outputMint: secondMint,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [user],
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
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [validationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    const policyType = defaultSubscriptionPolicy(100_000, now + 86400);
    const memo = new Array(64).fill(0);

    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
    forwardConfig.numDataChecks = 0;

    try {
      const ix = await program.methods
        .createComposablePolicy(
          policyType,
          memo,
          forwardConfig,
          0,
          Buffer.alloc(0)
        )
        .accountsStrict({
          feePayer: user.publicKey,
          user: user.publicKey,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          validationPda: validationPdaAddress,
          validationProgram: PublicKey.default,
          inputMint: tokenMint,
          outputMint: secondMint,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [user],
        { commitment: "processed" as Commitment }
      );

      assert(false, "Expected error for zero data checks");
    } catch (error: any) {
      expect(error.message).toContain("InsufficientByteRangeChecks");
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  //  5b. Create composable policy — fails when numDataChecks > MAX_BYTE_RANGE_CHECKS
  //      Regression for reports/H-04-num-data-checks-unbounded-oob.md:
  //      previously only >= 1 was validated, so numDataChecks = 5 (or 255)
  //      succeeded at create time and then panicked out-of-bounds on every
  //      execute_composable call, bricking the policy.
  // ══════════════════════════════════════════════════════════════════════
  test("Create composable policy — fails when numDataChecks exceeds MAX_BYTE_RANGE_CHECKS", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [validationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    const policyType = defaultSubscriptionPolicy(100_000, now + 86400);
    const memo = new Array(64).fill(0);

    // MAX_BYTE_RANGE_CHECKS == 4 on-chain. Sending 5 must be rejected at
    // create time with InsufficientByteRangeChecks.
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
    forwardConfig.numDataChecks = 5;

    try {
      const ix = await program.methods
        .createComposablePolicy(
          policyType,
          memo,
          forwardConfig,
          0,
          Buffer.alloc(0)
        )
        .accountsStrict({
          feePayer: user.publicKey,
          user: user.publicKey,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          validationPda: validationPdaAddress,
          validationProgram: PublicKey.default,
          inputMint: tokenMint,
          outputMint: secondMint,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [user],
        { commitment: "processed" as Commitment }
      );

      assert(false, "Expected error for numDataChecks > MAX_BYTE_RANGE_CHECKS");
    } catch (error: any) {
      expect(error.message).toContain("InsufficientByteRangeChecks");
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  //  5c. Create composable policy — fails when a ByteRangeCheck.length > 8
  //      Regression for reports/H-06-byte-range-check-length-unbounded.md:
  //      `expected` is a `[u8; 8]`, so any length > 8 panics at
  //      `&self.expected[..length]` during execute_composable. The
  //      create-time guard now rejects length > 8 with
  //      ByteRangeCheckFailed instead of bricking the policy.
  // ══════════════════════════════════════════════════════════════════════
  test("Create composable policy — fails when ByteRangeCheck.length > 8", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [validationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    const policyType = defaultSubscriptionPolicy(100_000, now + 86400);
    const memo = new Array(64).fill(0);

    // length = 16 with an 8-byte expected payload: offset + length = 16
    // <= 1024, so the existing overflow check passes, but the slice
    // `&expected[..16]` would panic on the `[u8; 8]` array. Must be
    // rejected at create time with ByteRangeCheckFailed.
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
    forwardConfig.dataChecks[0] = {
      offset: 0,
      length: 16,
      expected: [1, 2, 3, 4, 5, 6, 7, 8],
    };

    try {
      const ix = await program.methods
        .createComposablePolicy(
          policyType,
          memo,
          forwardConfig,
          0,
          Buffer.alloc(0)
        )
        .accountsStrict({
          feePayer: user.publicKey,
          user: user.publicKey,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          validationPda: validationPdaAddress,
          validationProgram: PublicKey.default,
          inputMint: tokenMint,
          outputMint: secondMint,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      await sendAndConfirmTransaction(
        connection,
        new Transaction().add(ix),
        [user],
        { commitment: "processed" as Commitment }
      );

      assert(false, "Expected error for ByteRangeCheck.length > 8");
    } catch (error: any) {
      expect(error.message).toContain("ByteRangeCheckFailed");
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  //  7. Change composable status — Active to Paused
  // ══════════════════════════════════════════════════════════════════════
  test("Change composable status — Active to Paused", async () => {
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [validationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    const policyType = defaultSubscriptionPolicy(100_000, now + 86400);
    const memo = new Array(64).fill(0);
    Buffer.from("Status test").copy(Buffer.from(memo));
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);

    const createIx = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        0,
        Buffer.alloc(0)
      )
      .accountsStrict({
        feePayer: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        validationPda: validationPdaAddress,
        validationProgram: PublicKey.default,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    let policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.status).toEqual({ active: {} });

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
    await sdk.updateWallet(new anchor.Wallet(user));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [validationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId
    );

    const activeBefore = userPaymentBefore!.activeComposableCount ?? 0;

    const now = Math.floor(Date.now() / 1000);
    const policyType = defaultSubscriptionPolicy(50_000, now + 86400);
    const memo = new Array(64).fill(0);
    Buffer.from("Delete test").copy(Buffer.from(memo));
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);

    const createIx = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        0,
        Buffer.alloc(0)
      )
      .accountsStrict({
        feePayer: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        validationPda: validationPdaAddress,
        validationProgram: PublicKey.default,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    let policy = await program.account.composablePolicy.fetch(
      composablePolicyPDA
    );
    expect(policy.status).toEqual({ active: {} });

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

    const deleteIx = await program.methods
      .deleteComposablePolicy(composablePolicyId)
      .accountsStrict({
        owner: user.publicKey,
        userPayment: userPaymentPDA,
        composablePolicy: composablePolicyPDA,
        config: configPDA,
        rentPayer: user.publicKey,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(deleteIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    const policyAfter = await program.account.composablePolicy.fetchNullable(
      composablePolicyPDA
    );
    expect(policyAfter).toBeNull();

    const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
    expect(userPaymentAfter!.activeComposableCount).toBe(activeBefore);
  });

  // ══════════════════════════════════════════════════════════════════════
  //  9. Execute composable — byte range check fails
  // ══════════════════════════════════════════════════════════════════════
  test("Execute composable — byte range check fails", async () => {
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [validationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId
    );

    const pastTime = Math.floor(Date.now() / 1000) - 3600;
    const policyType = defaultSubscriptionPolicy(100_000, pastTime);

    const memo = new Array(64).fill(0);
    Buffer.from("ByteCheck test").copy(Buffer.from(memo));

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

    const createIx = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        0,
        Buffer.alloc(0)
      )
      .accountsStrict({
        feePayer: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        validationPda: validationPdaAddress,
        validationProgram: PublicKey.default,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    await approve(
      connection,
      user,
      userTokenAccount,
      userPaymentPDA,
      user,
      10_000_000
    );

    const recipientTokenAccount = getAssociatedTokenAddressSync(
      secondMint,
      user.publicKey
    );
    await createAssociatedTokenAccountIdempotent(
      connection,
      admin,
      secondMint,
      user.publicKey
    );

    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const wrongInstructionData = Buffer.from(new Array(33).fill(0));

    try {
      const ix = await program.methods
        .executeComposable(wrongInstructionData, null)
        .accountsStrict({
          feePayer: gatewayAuthority.publicKey,
          paymentsDelegate,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          validationProgram: PublicKey.default,
          config: configPDA,
          userTokenAccount: userTokenAccount,
          mint: tokenMint,
          outputMint: secondMint,
          intermediateInputTokenAccount: getAssociatedTokenAddressSync(
            tokenMint,
            userPaymentPDA,
            true
          ),
          intermediateOutputTokenAccount: getAssociatedTokenAddressSync(
            secondMint,
            userPaymentPDA,
            true
          ),
          recipientTokenAccount,
          gatewayFeeAccount: getAssociatedTokenAddressSync(
            secondMint,
            feeRecipient.publicKey
          ),
          protocolFeeAccount: getAssociatedTokenAddressSync(
            secondMint,
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
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [validationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId
    );

    const pastTime = Math.floor(Date.now() / 1000) - 3600;
    const policyType = defaultSubscriptionPolicy(100_000, pastTime);

    const memo = new Array(64).fill(0);
    Buffer.from("Paused exec test").copy(Buffer.from(memo));
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);

    const createIx = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        0,
        Buffer.alloc(0)
      )
      .accountsStrict({
        feePayer: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        validationPda: validationPdaAddress,
        validationProgram: PublicKey.default,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createIx),
      [user],
      { commitment: "processed" as Commitment }
    );

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

    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    try {
      const ix = await program.methods
        .executeComposable(Buffer.from(new Array(32).fill(0)), null)
        .accountsStrict({
          feePayer: gatewayAuthority.publicKey,
          paymentsDelegate,
          composablePolicy: composablePolicyPDA,
          userPayment: userPaymentPDA,
          gateway: gatewayPDA,
          config: configPDA,
          userTokenAccount: userTokenAccount,
          validationProgram: PublicKey.default,
          mint: tokenMint,
          outputMint: secondMint,
          intermediateInputTokenAccount: getAssociatedTokenAddressSync(
            tokenMint,
            userPaymentPDA,
            true
          ),
          intermediateOutputTokenAccount: getAssociatedTokenAddressSync(
            secondMint,
            userPaymentPDA,
            true
          ),
          recipientTokenAccount: userSecondMintTokenAccount,
          gatewayFeeAccount: getAssociatedTokenAddressSync(
            secondMint,
            feeRecipient.publicKey
          ),
          protocolFeeAccount: getAssociatedTokenAddressSync(
            secondMint,
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

  test("Delete composable policy with validation — closes ValidationPDA", async () => {
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    const userPaymentBefore = await sdk.getUserPayment(userPaymentPDA);
    const composablePolicyId =
      (userPaymentBefore!.createdComposableCount ?? 0) + 1;
    const [composablePolicyPDA] = getComposablePolicyPda(
      userPaymentPDA,
      composablePolicyId,
      program.programId
    );

    const [validationPdaAddress] = getValidationPda(
      composablePolicyPDA,
      program.programId
    );

    const activeBefore = userPaymentBefore!.activeComposableCount ?? 0;

    const now = Math.floor(Date.now() / 1000);
    const policyType = defaultSubscriptionPolicy(50_000, now + 86400);
    const memo = new Array(64).fill(0);
    Buffer.from("Delete+Val test").copy(Buffer.from(memo));
    const forwardConfig = defaultForwardConfig(tokenMint, secondMint);
    const validationData = Buffer.from("validation-assertion-data-here");

    // Create with validation
    const createIx = await program.methods
      .createComposablePolicy(
        policyType,
        memo,
        forwardConfig,
        2,
        validationData
      )
      .accountsStrict({
        feePayer: user.publicKey,
        user: user.publicKey,
        composablePolicy: composablePolicyPDA,
        userPayment: userPaymentPDA,
        gateway: gatewayPDA,
        config: configPDA,
        validationPda: validationPdaAddress,
        validationProgram: LIGHTHOUSE_PUBKEY,
        inputMint: tokenMint,
        outputMint: secondMint,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(createIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    // Verify ValidationPDA exists
    const valPdaBefore = await connection.getAccountInfo(validationPdaAddress);
    expect(valPdaBefore).not.toBeNull();

    // Pause
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

    // Delete with ValidationPDA as remaining_accounts[0]
    const deleteIx = await program.methods
      .deleteComposablePolicy(composablePolicyId)
      .accountsStrict({
        owner: user.publicKey,
        userPayment: userPaymentPDA,
        composablePolicy: composablePolicyPDA,
        config: configPDA,
        rentPayer: user.publicKey,
      })
      .remainingAccounts([
        {
          pubkey: validationPdaAddress,
          isSigner: false,
          isWritable: true,
        },
      ])
      .instruction();

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(deleteIx),
      [user],
      { commitment: "processed" as Commitment }
    );

    // Both accounts should be closed
    const policyAfter = await program.account.composablePolicy.fetchNullable(
      composablePolicyPDA
    );
    expect(policyAfter).toBeNull();

    const valPdaAfter = await connection.getAccountInfo(validationPdaAddress);
    expect(valPdaAfter).toBeNull();

    const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
    expect(userPaymentAfter!.activeComposableCount).toBe(activeBefore);
  });
});
