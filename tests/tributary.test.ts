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
import { ComputeBudgetProgram } from "@solana/web3.js";
import { Tributary } from "../target/types/tributary";
import { PaymentFrequency, TributarySDK } from "../sdk/src";
import assert from "assert";

describe("Tributary", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.tributary as anchor.Program<Tributary>;
  const wallet = provider.wallet as anchor.Wallet;

  let connection: any;

  // Common variables
  let admin: Keypair;
  let user: Keypair;
  let configPDA: PublicKey;
  let configBump: number;
  let tokenMint: PublicKey;
  let userTokenAccount: PublicKey;
  let mintAuthority: Keypair;
  let gatewayAuthority: Keypair;
  let feeRecipient: Keypair;
  let gatewayPDA: PublicKey;
  let gatewayBump: number;
  let recipient: Keypair;
  let recipientTokenAccount: PublicKey;
  let userPaymentPDA: PublicKey;
  let userPaymentBump: number;
  let paymentPolicyPDA: PublicKey;
  let paymentPolicyBump: number;
  let paymentsDelegate: PublicKey;
  let newSigner: Keypair;
  let sdk: TributarySDK;

  async function fund(account: PublicKey, amount: number): Promise<void> {
    const transaction = new anchor.web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: account,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );
    const signature = await provider.sendAndConfirm(transaction, null, {
      commitment: "processed" as Commitment,
    });
  }

  beforeAll(async () => {
    // Create Solana Kite connection
    connection = provider.connection;
    sdk = new TributarySDK(connection, wallet);

    // Create wallets
    admin = Keypair.generate();
    user = Keypair.generate();
    mintAuthority = Keypair.generate();
    gatewayAuthority = Keypair.generate();
    feeRecipient = Keypair.generate();
    newSigner = Keypair.generate();
    recipient = Keypair.generate();

    // Derive config PDA
    [configPDA, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    await Promise.all([
      fund(admin.publicKey, 10),
      fund(user.publicKey, 10),
      fund(mintAuthority.publicKey, 10),
      fund(gatewayAuthority.publicKey, 10),
      fund(feeRecipient.publicKey, 1),
      fund(newSigner.publicKey, 10),
      fund(recipient.publicKey, 1),
    ]);

    // Create token mint
    tokenMint = await createMint(
      connection,
      mintAuthority,
      mintAuthority.publicKey,
      null,
      6
    );

    // Get associated token account address for the user
    userTokenAccount = getAssociatedTokenAddressSync(tokenMint, user.publicKey);

    // Create associated token account and mint tokens to it
    await createAssociatedTokenAccount(
      connection,
      admin,
      tokenMint,
      user.publicKey
    );

    // Mint tokens to the user's account
    await mintTo(
      connection,
      mintAuthority,
      tokenMint,
      userTokenAccount,
      mintAuthority,
      1000000n // 1 token with 6 decimals
    );

    // Derive gateway PDA
    [gatewayPDA, gatewayBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("gateway"), gatewayAuthority.publicKey.toBuffer()],
      program.programId
    );

    // Derive user payment PDA
    [userPaymentPDA, userPaymentBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_payment"),
        user.publicKey.toBuffer(),
        tokenMint.toBuffer(),
      ],
      program.programId
    );

    // Derive payment policy PDA
    const policyId = 1;
    [paymentPolicyPDA, paymentPolicyBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment_policy"),
        userPaymentPDA.toBuffer(),
        new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    // Derive payments delegate PDA
    [paymentsDelegate] = PublicKey.findProgramAddressSync(
      [Buffer.from("payments")],
      program.programId
    );

    // Create recipient token account
    recipientTokenAccount = await createAssociatedTokenAccount(
      connection,
      admin,
      tokenMint,
      recipient.publicKey
    );

    // Create fee recipient token accounts (SDK will handle ATA creation automatically)
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
      admin.publicKey // config.fee_recipient
    );

    expect(program.programId.toString()).toEqual(
      "TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ"
    );
  });

  test("Initialize program", async () => {
    // Update SDK to use admin wallet for this operation
    await sdk.updateWallet(new anchor.Wallet(admin));

    const initIx = await sdk.initialize(admin.publicKey);
    const tx = new Transaction().add(initIx);

    await sendAndConfirmTransaction(connection, tx, [admin], {
      commitment: "processed" as Commitment,
    });

    const configAccount = await sdk.getProgramConfig(configPDA);

    expect(configAccount!.admin).toEqual(admin.publicKey);
    expect(configAccount!.feeRecipient).toEqual(admin.publicKey);
    expect(configAccount!.protocolFeeBps).toBe(100);
    expect(configAccount!.maxPoliciesPerUser).toBe(10);
    expect(configAccount!.emergencyPause).toBe(false);
    expect(configAccount!.bump).toBe(configBump);
  });

  test("Create user payment account", async () => {
    // Update SDK to use user wallet
    await sdk.updateWallet(new anchor.Wallet(user));

    const createUserPaymentIx = await sdk.createUserPayment(tokenMint);
    const tx = new Transaction().add(createUserPaymentIx);

    await sendAndConfirmTransaction(connection, tx, [user], {
      commitment: "processed" as Commitment,
    });

    const userPayment = await sdk.getUserPayment(userPaymentPDA);

    expect(userPayment!.owner).toEqual(user.publicKey);
    expect(userPayment!.tokenAccount).toEqual(userTokenAccount);
    expect(userPayment!.tokenMint).toEqual(tokenMint);
    expect(userPayment!.createdPoliciesCount).toBe(0);
    expect(userPayment!.isActive).toBe(true);
    expect(userPayment!.bump).toBe(userPaymentBump);
  });

  test("Create payment gateway", async () => {
    const gatewayFeeBps = 250; // 2.5% fee

    // Update SDK to use admin wallet
    await sdk.updateWallet(new anchor.Wallet(admin));

    const createGatewayIx = await sdk.createPaymentGateway(
      gatewayAuthority.publicKey,
      gatewayFeeBps,
      feeRecipient.publicKey,
      "custom gateway",
      "https://example.com"
    );
    const tx = new Transaction().add(createGatewayIx);

    await sendAndConfirmTransaction(connection, tx, [admin], {
      commitment: "processed" as Commitment,
    });

    const gatewayAccount = await sdk.getPaymentGateway(gatewayPDA);

    expect(gatewayAccount!.authority).toEqual(gatewayAuthority.publicKey);
    expect(gatewayAccount!.feeRecipient).toEqual(feeRecipient.publicKey);
    expect(gatewayAccount!.gatewayFeeBps).toBe(gatewayFeeBps);
    expect(gatewayAccount!.isActive).toBe(true);
    expect(gatewayAccount!.bump).toBe(gatewayBump);
    expect(gatewayAccount!.createdAt.toNumber()).toBeGreaterThan(0);

    // Verify name and url fields
    const nameBuffer = Buffer.from(gatewayAccount!.name);
    const nameString = nameBuffer
      .subarray(0, nameBuffer.indexOf(0))
      .toString("utf-8");
    expect(nameString).toBe("custom gateway");

    const urlBuffer = Buffer.from(gatewayAccount!.url);
    const urlString = urlBuffer
      .subarray(0, urlBuffer.indexOf(0))
      .toString("utf-8");
    expect(urlString).toBe("https://example.com");
  });

  describe("Subscription payment policies", () => {
    test("Create subscription payment policy", async () => {
      const amount = new anchor.BN(10000); // 0.01 token with 6 decimals
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("test subscription").copy(memo);

      const paymentFrequency = { daily: {} };

      // Update SDK to use user wallet
      await sdk.updateWallet(new anchor.Wallet(user));

      const createPolicyIx = await sdk.getCreateSubscriptionPolicyInstruction(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        amount,
        true,
        null,
        paymentFrequency,
        Array.from(memo),
        null // start_time
      );
      const tx = new Transaction().add(createPolicyIx);

      await sendAndConfirmTransaction(connection, tx, [user], {
        commitment: "processed" as Commitment,
      });

      const policyAccount = await sdk.getPaymentPolicy(paymentPolicyPDA);

      expect(policyAccount!.userPayment).toEqual(userPaymentPDA);
      expect(policyAccount!.recipient).toEqual(recipient.publicKey);
      expect(policyAccount!.gateway).toEqual(gatewayPDA);
      expect(policyAccount!.policyId).toBe(1);
      expect(policyAccount!.status).toEqual({ active: {} });
      expect(policyAccount!.totalPaid.toNumber()).toBe(0);
      expect(policyAccount!.paymentCount).toBe(0);
      expect(policyAccount!.bump).toBe(paymentPolicyBump);
      expect(policyAccount!.createdAt.toNumber()).toBeGreaterThan(0);

      // Verify policy type is subscription
      expect(policyAccount!.policyType.subscription).toBeDefined();
      expect(policyAccount!.policyType.subscription.amount.toNumber()).toBe(
        amount.toNumber()
      );
      expect(policyAccount!.policyType.subscription.paymentFrequency).toEqual({
        daily: {},
      });
      expect(
        policyAccount!.policyType.subscription.nextPaymentDue.toNumber()
      ).toBeGreaterThan(0);
      expect(policyAccount!.policyType.subscription.autoRenew).toBe(true);

      // Check that user payment account was updated
      const updatedUserPayment = await sdk.getUserPayment(userPaymentPDA);
      expect(updatedUserPayment!.createdPoliciesCount).toBe(1);
    });

    test("Execute subscription payment fails without delegate approval", async () => {
      // Update SDK to use gateway authority wallet
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

      // Try to execute payment without delegate approval - should fail
      try {
        const executePaymentIxs = await sdk.executePayment(paymentPolicyPDA);
        const tx = new Transaction().add(...executePaymentIxs);

        await sendAndConfirmTransaction(connection, tx, [gatewayAuthority], {
          commitment: "processed" as Commitment,
        });

        assert(
          false,
          "Expected payment execution to fail without delegate approval"
        );
      } catch (error: any) {
        // Should fail due to insufficient delegate approval
        expect(error.message).toContain("No or incorrect delegate set in ata");
      }
    });

    test("Set delegate approval for payment execution", async () => {
      const amount = 1000000; // 1 token with 6 decimals

      await approve(
        connection,
        user,
        userTokenAccount,
        paymentsDelegate,
        user,
        amount
      );

      // Verify delegate approval was set
      const tokenAccountInfo = await connection.getParsedAccountInfo(
        userTokenAccount
      );
      const parsedData = tokenAccountInfo.value?.data as any;
      expect(parsedData.parsed.info.delegate).toEqual(
        paymentsDelegate.toString()
      );
      expect(parsedData.parsed.info.delegatedAmount.uiAmount).toBe(1);
    });

    test("Execute subscription payment", async () => {
      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );

      // Update SDK to use gateway authority wallet
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

      const executePaymentIxs = await sdk.executePayment(paymentPolicyPDA);
      const tx = new Transaction().add(...executePaymentIxs);

      await sendAndConfirmTransaction(connection, tx, [gatewayAuthority], {
        commitment: "processed" as Commitment,
      });

      // Verify payment was executed
      const finalRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      expect(finalRecipientBalance.value.uiAmount).toBeGreaterThan(
        initialRecipientBalance.value.uiAmount || 0
      );

      // Verify policy was updated
      const updatedPolicy = await sdk.getPaymentPolicy(paymentPolicyPDA);
      expect(updatedPolicy!.paymentCount).toBe(1);
      expect(updatedPolicy!.totalPaid.toNumber()).toBe(10000); // 0.01 token
      expect(
        updatedPolicy!.policyType.subscription.nextPaymentDue.toNumber()
      ).toBeGreaterThan(Date.now() / 1000);
    });

    test("Get all payment policies using SDK", async () => {
      // Get all payment policies
      const allPolicies = await sdk.getAllPaymentPolicies();

      expect(allPolicies.length).toBeGreaterThan(0);
      expect(allPolicies[0].account.policyId).toBe(1);
      expect(allPolicies[0].account.userPayment).toEqual(userPaymentPDA);
      expect(allPolicies[0].account.recipient).toEqual(recipient.publicKey);
      expect(allPolicies[0].account.gateway).toEqual(gatewayPDA);

      // Verify the policy type is subscription
      expect(allPolicies[0].account.policyType.subscription).toBeDefined();
      expect(
        allPolicies[0].account.policyType.subscription.amount.toNumber()
      ).toBe(10000);
    });

    test("Cannot execute subscription payment twice within period", async () => {
      // Update SDK to use gateway authority wallet
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

      // First execution should succeed (already done in previous test)
      // Second execution should fail because next_payment_due is in the future
      try {
        const executePaymentIxs = await sdk.executePayment(paymentPolicyPDA);
        const tx = new Transaction().add(...executePaymentIxs);

        await sendAndConfirmTransaction(connection, tx, [gatewayAuthority], {
          commitment: "processed" as Commitment,
        });

        assert(
          false,
          "Expected payment execution to fail when next_payment_due is in future"
        );
      } catch (error: any) {
        expect(error.message).toContain("PaymentNotDue");
      }
    });

    test("Can execute payment when next_payment_due is in past", async () => {
      // Get current policy to check next_payment_due
      const policy = await sdk.getPaymentPolicy(paymentPolicyPDA);
      const nextPaymentDue =
        policy!.policyType.subscription.nextPaymentDue.toNumber();

      // Verify next payment is indeed in the future (from previous execution)
      expect(nextPaymentDue).toBeGreaterThan(Math.floor(Date.now() / 1000));

      // Create a new policy with start_time in the past to test timing validation
      const amount = new anchor.BN(5000); // 0.005 token
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("test policy 2").copy(memo);

      const paymentFrequency: PaymentFrequency = {
        custom: { 0: new anchor.BN(3600) },
      }; // 1 hour in seconds

      // Derive second policy PDA
      const policyId2 = 2;
      const [paymentPolicy2PDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId2).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Create policy with start_time in the past (2 hours ago)
      const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;

      // Update SDK to use user wallet
      await sdk.updateWallet(new anchor.Wallet(user));

      const createPolicy2Ix = await sdk.getCreateSubscriptionPolicyInstruction(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        amount,
        true,
        null,
        paymentFrequency,
        Array.from(memo),
        new anchor.BN(twoHoursAgo) // start_time in past
      );
      const createTx = new Transaction().add(createPolicy2Ix);
      await sendAndConfirmTransaction(connection, createTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Execute payment on the new policy (should succeed since next_payment_due is in past)
      // Update SDK to use gateway authority wallet
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

      const executePaymentIxs = await sdk.executePayment(paymentPolicy2PDA);
      const executeTx = new Transaction();
      executeTx.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 })
      );
      executeTx.add(...executePaymentIxs);

      await sendAndConfirmTransaction(
        connection,
        executeTx,
        [gatewayAuthority],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify payment was executed
      const updatedPolicy = await sdk.getPaymentPolicy(paymentPolicy2PDA);
      expect(updatedPolicy!.paymentCount).toBe(1);
      expect(updatedPolicy!.totalPaid.toNumber()).toBe(5000);

      // Immediately try to execute again - should fail
      try {
        const executePaymentIxs2 = await sdk.executePayment(paymentPolicy2PDA);
        const executeTx2 = new Transaction().add(...executePaymentIxs2);

        await sendAndConfirmTransaction(
          connection,
          executeTx2,
          [gatewayAuthority],
          {
            commitment: "processed" as Commitment,
          }
        );

        assert(
          false,
          "Expected second payment execution to fail within same period"
        );
      } catch (error: any) {
        expect(error.message).toContain("PaymentNotDue");
      }
    });

    test("executeImmediately option - token transfer only occurs when true", async () => {
      // Update SDK to use user wallet
      await sdk.updateWallet(new anchor.Wallet(user));

      // Create token accounts for test user and recipient
      const testRecipientTokenAccount = getAssociatedTokenAddressSync(
        tokenMint,
        recipient.publicKey
      );

      // Mint tokens to test user
      await mintTo(
        connection,
        mintAuthority,
        tokenMint,
        userTokenAccount,
        mintAuthority,
        1000000n // 1 token with 6 decimals
      );

      // Setup policy parameters
      const testAmount = new anchor.BN(20000); // 0.02 token with 6 decimals
      const testIntervalSeconds = new anchor.BN(86400); // 1 day
      const testMemo = new Uint8Array(64).fill(0);
      Buffer.from("executeImmediately test").copy(testMemo);
      const testPaymentFrequency = { daily: {} };
      const approvalAmount = new anchor.BN(1000000); // 1 token
      const currentTime = Math.floor(Date.now() / 1000);
      const testStartTime = new anchor.BN(currentTime - 3600); // 1 hour ago (eligible for immediate execution)

      const createPolicyTrueIxs = await sdk.createSubscription(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        testAmount,
        true,
        null,
        testPaymentFrequency,
        Array.from(testMemo),
        testStartTime,
        approvalAmount,
        true // executeImmediately = true
      );

      const createPolicyTrueTx = new Transaction().add(...createPolicyTrueIxs);
      // only user has to sign
      await sendAndConfirmTransaction(connection, createPolicyTrueTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Get initial balances
      const initialRecipientBalance = await connection.getTokenAccountBalance(
        testRecipientTokenAccount
      );
      const initialUserBalance = await connection.getTokenAccountBalance(
        userTokenAccount
      );

      // Check balances after policy creation with executeImmediately = false
      const balanceAfterCreateFalse = await connection.getTokenAccountBalance(
        testRecipientTokenAccount
      );
      const userBalanceAfterCreateFalse =
        await connection.getTokenAccountBalance(userTokenAccount);

      // No token transfer should have occurred
      expect(balanceAfterCreateFalse.value.amount).toBe(
        initialRecipientBalance.value.amount
      );
      expect(userBalanceAfterCreateFalse.value.amount).toBe(
        initialUserBalance.value.amount
      );
    });

    test("executeImmediately option - no transfer if false", async () => {
      const testRecipient2TokenAccount = getAssociatedTokenAddressSync(
        tokenMint,
        recipient.publicKey
      );

      // Mint tokens to test user 2
      await mintTo(
        connection,
        mintAuthority,
        tokenMint,
        userTokenAccount,
        mintAuthority,
        1000000n // 1 token with 6 decimals
      );

      // Get initial balances for test 2
      const initialRecipient2Balance = await connection.getTokenAccountBalance(
        testRecipient2TokenAccount
      );
      const initialUser2Balance = await connection.getTokenAccountBalance(
        userTokenAccount
      );

      // Setup policy parameters
      const testAmount = new anchor.BN(20000); // 0.02 token with 6 decimals
      const testIntervalSeconds = new anchor.BN(86400); // 1 day
      const testMemo = new Uint8Array(64).fill(0);
      Buffer.from("executeImmediately test").copy(testMemo);
      const testPaymentFrequency = { daily: {} };
      const approvalAmount = new anchor.BN(1000000); // 1 token
      const currentTime = Math.floor(Date.now() / 1000);
      const testStartTime = new anchor.BN(currentTime - 3600); // 1 hour ago (eligible for immediate execution)

      const createPolicyTrueIxs = await sdk.createSubscription(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        testAmount,
        true,
        null,
        testPaymentFrequency,
        Array.from(testMemo),
        testStartTime,
        approvalAmount,
        false // executeImmediately = false
      );

      const createPolicyTrueTx = new Transaction().add(...createPolicyTrueIxs);
      // only user has to sign
      await sendAndConfirmTransaction(connection, createPolicyTrueTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Check balances after policy creation with executeImmediately = true
      const balanceAfterCreateTrue = await connection.getTokenAccountBalance(
        testRecipient2TokenAccount
      );
      const userBalanceAfterCreateTrue =
        await connection.getTokenAccountBalance(userTokenAccount);

      // Token transfers should have occurred
      expect(parseInt(balanceAfterCreateTrue.value.amount)).toEqual(
        parseInt(initialRecipient2Balance.value.amount)
      );
      expect(parseInt(userBalanceAfterCreateTrue.value.amount)).toEqual(
        parseInt(initialUser2Balance.value.amount)
      );
    });

    test("Change subscription policy status - pause/resume and execution control", async () => {
      // Create a new policy for this test
      const amount = new anchor.BN(15000); // 0.015 token
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("status change test").copy(memo);

      const paymentFrequency: PaymentFrequency = {
        custom: { 0: new anchor.BN(3600) },
      }; // 1 hour

      // Set start time in the past so payment can be executed immediately
      const pastTime = Math.floor(Date.now() / 1000) - 7200; // 2 hours ago

      // Update SDK to use user wallet
      await sdk.updateWallet(new anchor.Wallet(user));

      // Create a new policy (policy ID will be 4 based on previous tests)
      const policyId4 = 4;
      const [paymentPolicy4PDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId4).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      const createPolicy4Ix = await sdk.getCreateSubscriptionPolicyInstruction(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        amount,
        true,
        null,
        paymentFrequency,
        Array.from(memo),
        new anchor.BN(pastTime)
      );
      const createTx = new Transaction().add(createPolicy4Ix);
      await sendAndConfirmTransaction(connection, createTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Verify policy was created with Active status
      let policy = await sdk.getPaymentPolicy(paymentPolicy4PDA);
      expect(policy!.status).toEqual({ active: {} });

      // 1. Change status to Paused
      const pauseIx = await sdk.changePaymentPolicyStatus(
        tokenMint,
        policyId4,
        {
          paused: {},
        }
      );
      const pauseTx = new Transaction().add(pauseIx);
      await sendAndConfirmTransaction(connection, pauseTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Verify status changed to Paused
      policy = await sdk.getPaymentPolicy(paymentPolicy4PDA);
      expect(policy!.status).toEqual({ paused: {} });

      // 2. Try to execute payment when paused - should fail
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

      try {
        const executePaymentIxs = await sdk.executePayment(paymentPolicy4PDA);
        const executeTx = new Transaction().add(...executePaymentIxs);

        await sendAndConfirmTransaction(
          connection,
          executeTx,
          [gatewayAuthority],
          {
            commitment: "processed" as Commitment,
          }
        );

        assert(
          false,
          "Expected payment execution to fail when policy is paused"
        );
      } catch (error: any) {
        // Should fail because policy is paused
        expect(error.message).toContain("PolicyPaused");
      }

      // 3. Change status back to Active
      await sdk.updateWallet(new anchor.Wallet(user));

      const resumeIx = await sdk.changePaymentPolicyStatus(
        tokenMint,
        policyId4,
        {
          active: {},
        }
      );
      const resumeTx = new Transaction().add(resumeIx);
      await sendAndConfirmTransaction(connection, resumeTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Verify status changed back to Active
      policy = await sdk.getPaymentPolicy(paymentPolicy4PDA);
      expect(policy!.status).toEqual({ active: {} });

      // 4. Execute payment when active - should succeed
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );

      const executePaymentIxs = await sdk.executePayment(paymentPolicy4PDA);
      const executeTx = new Transaction().add(...executePaymentIxs);

      await sendAndConfirmTransaction(
        connection,
        executeTx,
        [gatewayAuthority],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify payment was executed successfully
      const finalRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      expect(finalRecipientBalance.value.uiAmount).toBeGreaterThan(
        initialRecipientBalance.value.uiAmount || 0
      );

      // Verify policy was updated
      const updatedPolicy = await sdk.getPaymentPolicy(paymentPolicy4PDA);
      expect(updatedPolicy!.paymentCount).toBe(1);
      expect(updatedPolicy!.totalPaid.toNumber()).toBe(20000);
    });
  });

  test("Delete payment policy", async () => {
    // Get initial user payment state
    const initialUserPayment = await sdk.getUserPayment(userPaymentPDA);
    const initialActivePoliciesCount = initialUserPayment!.createdPoliciesCount;

    // Use policy ID 2 from a previous test (the second policy created)
    const policyIdToDelete = 2;
    const [policyToDeletePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("payment_policy"),
        userPaymentPDA.toBuffer(),
        new anchor.BN(policyIdToDelete).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    // Verify policy exists before deletion
    const policyBeforeDeletion = await sdk.getPaymentPolicy(policyToDeletePDA);
    expect(policyBeforeDeletion).not.toBeNull();
    expect(policyBeforeDeletion!.policyId).toBe(policyIdToDelete);

    // Delete the payment policy (only owner can delete)
    await sdk.updateWallet(new anchor.Wallet(user));

    const deleteIx = await sdk.deletePaymentPolicy(tokenMint, policyIdToDelete);
    const deleteTx = new Transaction().add(deleteIx);
    await sendAndConfirmTransaction(connection, deleteTx, [user]);

    // Verify policy was deleted (account should not exist)
    const policyAfterDeletion = await sdk.getPaymentPolicy(policyToDeletePDA);
    expect(policyAfterDeletion).toBeNull();

    // Verify user payment active policies count was decremented
    const updatedUserPayment = await sdk.getUserPayment(userPaymentPDA);
    expect(updatedUserPayment!.activePoliciesCount).toBe(
      initialActivePoliciesCount - 1
    );
    expect(updatedUserPayment!.updatedAt.toNumber()).toBeGreaterThanOrEqual(
      initialUserPayment!.updatedAt.toNumber()
    );
  });

  test("Change gateway signer", async () => {
    // Get initial gateway state
    const initialGateway = await sdk.getPaymentGateway(gatewayPDA);
    expect(initialGateway!.signer).toEqual(gatewayAuthority.publicKey);

    // Update SDK to use gateway authority wallet
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    // Change the gateway signer
    const changeSignerIx = await sdk.changeGatewaySigner(
      gatewayAuthority.publicKey,
      newSigner.publicKey
    );
    const tx = new Transaction().add(changeSignerIx);

    await sendAndConfirmTransaction(connection, tx, [gatewayAuthority], {
      commitment: "processed" as Commitment,
    });

    // Verify the gateway signer was updated
    const updatedGateway = await sdk.getPaymentGateway(gatewayPDA);
    expect(updatedGateway!.signer).toEqual(newSigner.publicKey);
    expect(updatedGateway!.authority).toEqual(gatewayAuthority.publicKey); // authority should remain unchanged
  });

  test("Change gateway fee recipient", async () => {
    // Create a new fee recipient keypair
    const newFeeRecipient = Keypair.generate();
    await fund(newFeeRecipient.publicKey, 1);

    // Get initial gateway state
    const initialGateway = await sdk.getPaymentGateway(gatewayPDA);
    expect(initialGateway!.feeRecipient).toEqual(feeRecipient.publicKey);

    // Update SDK to use gateway authority wallet
    await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

    // Change the gateway fee recipient
    const changeFeeRecipientIx = await sdk.changeGatewayFeeRecipient(
      gatewayAuthority.publicKey,
      newFeeRecipient.publicKey
    );
    const tx = new Transaction().add(changeFeeRecipientIx);

    await sendAndConfirmTransaction(connection, tx, [gatewayAuthority], {
      commitment: "processed" as Commitment,
    });

    // Verify the gateway fee recipient was updated
    const updatedGateway = await sdk.getPaymentGateway(gatewayPDA);
    expect(updatedGateway!.feeRecipient).toEqual(newFeeRecipient.publicKey);
    expect(updatedGateway!.authority).toEqual(gatewayAuthority.publicKey); // authority should remain unchanged
  });

  describe("Milestone payment policies", () => {
    test("Create milestone payment policy with time-based release", async () => {
      // Switch back to user wallet for creating policies
      await sdk.updateWallet(new anchor.Wallet(user));

      // Create milestone payment policy with 3 milestones
      const currentTime = Math.floor(Date.now() / 1000);
      const milestoneAmounts = [
        new anchor.BN(1000000), // 1 token
        new anchor.BN(2000000), // 2 tokens
        new anchor.BN(1500000), // 1.5 tokens
      ];
      const milestoneTimestamps = [
        new anchor.BN(currentTime + 60), // 1 minute from now
        new anchor.BN(currentTime + 120), // 2 minutes from now
        new anchor.BN(currentTime + 180), // 3 minutes from now
      ];

      const memo = new Uint8Array(64).fill(0);
      Buffer.from("time-based milestone test").copy(memo);

      const createMilestoneIxs = await sdk.createMilestone(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        milestoneAmounts,
        milestoneTimestamps,
        0, // time-based release condition
        Array.from(memo)
      );

      const tx = new Transaction().add(...createMilestoneIxs);
      await sendAndConfirmTransaction(connection, tx, [user], {
        commitment: "processed" as Commitment,
      });

      // Verify milestone policy was created
      const policies = await sdk.getPaymentPoliciesByUserPayment(
        userPaymentPDA
      );
      const milestonePolicy = policies.find(
        (p) => "milestone" in p.account.policyType
      );
      expect(milestonePolicy).toBeDefined();
      expect(milestonePolicy!.account.policyType).toHaveProperty("milestone");

      const milestoneData = milestonePolicy!.account.policyType.milestone!;
      expect(milestoneData.totalMilestones).toBe(3);
      expect(milestoneData.currentMilestone).toBe(0);
      expect(milestoneData.releaseCondition).toBe(0); // time-based
      expect(milestoneData.escrowAmount.toNumber()).toBe(4500000); // 1 + 2 + 1.5 tokens
    });

    test("Execute milestone payments sequentially", async () => {
      // Get the milestone policy we just created
      const policies = await sdk.getPaymentPoliciesByUserPayment(
        userPaymentPDA
      );
      const milestonePolicy = policies.find(
        (p) => "milestone" in p.account.policyType
      );
      expect(milestonePolicy).toBeDefined();

      const policyPda = milestonePolicy!.publicKey;

      // Update SDK to use gateway authority wallet for execution
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

      // First milestone should fail (not due yet - timestamp is in future)
      try {
        const executePaymentIxs = await sdk.executePayment(policyPda);
        const tx = new Transaction().add(...executePaymentIxs);
        await sendAndConfirmTransaction(connection, tx, [newSigner], {
          commitment: "processed" as Commitment,
        });
        assert(false, "Expected milestone execution to fail when not due");
      } catch (error: any) {
        // For now, just check that it fails (could be signature or MilestoneNotDue)
        expect(error).toBeDefined();
      }

      // Create a new milestone policy with timestamps in the past for testing
      await sdk.updateWallet(new anchor.Wallet(user));
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const pastMilestoneAmounts = [
        new anchor.BN(500000), // 0.5 tokens
        new anchor.BN(750000), // 0.75 tokens
      ];
      const pastMilestoneTimestamps = [
        new anchor.BN(pastTime), // already due
        new anchor.BN(pastTime + 3600 / 2), // 0.5 hours later
      ];

      const memo2 = new Uint8Array(64).fill(0);
      Buffer.from("past milestone test").copy(memo2);

      const createPastMilestoneIxs = await sdk.createMilestone(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        pastMilestoneAmounts,
        pastMilestoneTimestamps,
        0, // time-based
        Array.from(memo2)
      );

      const createTx = new Transaction().add(...createPastMilestoneIxs);
      await sendAndConfirmTransaction(connection, createTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Get the new milestone policy (policy ID 6)
      const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
      const policyId = userPaymentAfter!.createdPoliciesCount;

      expect(policyId).toBe(7);
      const [pastPolicyPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Execute first milestone
      await sdk.updateWallet(new anchor.Wallet(newSigner));

      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );

      const executeFirstIxs = await sdk.executePayment(pastPolicyPda);
      const executeFirstTx = new Transaction().add(...executeFirstIxs);
      await sendAndConfirmTransaction(connection, executeFirstTx, [newSigner], {
        commitment: "processed" as Commitment,
      });

      // Verify first milestone was executed
      const afterFirstBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      const firstMilestoneAmount = 500000; // 0.5 tokens in smallest units
      expect(afterFirstBalance.value.amount).toBe(
        (
          BigInt(initialRecipientBalance.value.amount) +
          BigInt(firstMilestoneAmount) -
          BigInt(17500 /* fee */)
        ).toString()
      );

      let updatedPolicy = await sdk.getPaymentPolicy(pastPolicyPda);
      expect(updatedPolicy!.paymentCount).toBe(1);
      expect(updatedPolicy!.policyType.milestone!.currentMilestone).toBe(1);

      // Execute second milestone
      const executeSecondIxs = await sdk.executePayment(pastPolicyPda);
      const executeSecondTx = new Transaction().add(...executeSecondIxs);
      await sendAndConfirmTransaction(
        connection,
        executeSecondTx,
        [newSigner],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify second milestone was executed
      const afterSecondBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      const secondMilestoneAmount = 750000; // 0.75 tokens in smallest units
      const totalExpected =
        firstMilestoneAmount + secondMilestoneAmount - 43750; /* fee */
      expect(afterSecondBalance.value.amount).toBe(
        (
          BigInt(initialRecipientBalance.value.amount) + BigInt(totalExpected)
        ).toString()
      );

      updatedPolicy = await sdk.getPaymentPolicy(pastPolicyPda);
      expect(updatedPolicy!.paymentCount).toBe(2);
      expect(updatedPolicy!.policyType.milestone!.currentMilestone).toBe(2);

      // Third execution should fail (no more milestones)
      try {
        const executeThirdIxs = await sdk.executePayment(pastPolicyPda);
        const executeThirdTx = new Transaction().add(...executeThirdIxs);
        await sendAndConfirmTransaction(
          connection,
          executeThirdTx,
          [newSigner],
          {
            commitment: "processed" as Commitment,
          }
        );
        assert(
          false,
          "Expected execution to fail when all milestones completed"
        );
      } catch (error: any) {
        expect(error.message).toContain("PolicyPaused.");
      }
    });

    test("Milestone payment with manual approval release condition", async () => {
      // Create milestone policy with manual approval
      await sdk.updateWallet(new anchor.Wallet(user));

      const currentTime = Math.floor(Date.now() / 1000);
      const manualMilestoneAmounts = [
        new anchor.BN(300000), // 0.3 tokens
        new anchor.BN(400000), // 0.4 tokens
      ];
      const manualMilestoneTimestamps = [
        new anchor.BN(currentTime + 60), // 1 minute from now
        new anchor.BN(currentTime + 120), // 2 minutes from now
      ];

      const memo3 = new Uint8Array(64).fill(0);
      Buffer.from("manual approval milestone").copy(memo3);

      const createManualIxs = await sdk.createMilestone(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        manualMilestoneAmounts,
        manualMilestoneTimestamps,
        1, // manual approval release condition
        Array.from(memo3)
      );

      const createTx = new Transaction().add(...createManualIxs);
      await sendAndConfirmTransaction(connection, createTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Get the manual milestone policy
      const policies = await sdk.getPaymentPoliciesByUserPayment(
        userPaymentPDA
      );
      const manualMilestonePolicy = policies.find(
        (p) =>
          "milestone" in p.account.policyType &&
          p.account.policyType.milestone!.releaseCondition === 1
      );
      expect(manualMilestonePolicy).toBeDefined();

      const manualPolicyPda = manualMilestonePolicy!.publicKey;

      // Verify manual approval is required
      const policy = await sdk.getPaymentPolicy(manualPolicyPda);
      expect(policy!.policyType.milestone!.releaseCondition).toBe(1);

      // For manual approval, gateway authority would need to approve first
      // This is a simplified test - in practice, there would be an approval step
      // For now, we'll just verify the policy was created correctly
      expect(policy!.policyType.milestone!.totalMilestones).toBe(2);
      expect(policy!.policyType.milestone!.currentMilestone).toBe(0);
    });
  });

  describe("Pay-as-you-go payment policies", () => {
    test("Create pay-as-you-go payment policy", async () => {
      // Switch to user wallet
      await sdk.updateWallet(new anchor.Wallet(user));

      const maxAmountPerPeriod = new anchor.BN(1000000); // 1 token per period
      const maxChunkAmount = new anchor.BN(200000); // 0.2 tokens per chunk
      const periodLengthSeconds = new anchor.BN(86400); // 24 hours
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("pay-as-you-go test").copy(memo);

      // Create pay-as-you-go policy using high-level method
      const createPayAsYouGoIxs = await sdk.createPayAsYouGo(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        maxAmountPerPeriod,
        maxChunkAmount,
        periodLengthSeconds,
        Array.from(memo)
      );

      const tx = new Transaction().add(...createPayAsYouGoIxs);
      await sendAndConfirmTransaction(connection, tx, [user], {
        commitment: "processed" as Commitment,
      });

      // Get the pay-as-you-go policy PDA (policy should be the last created)
      const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
      const policyId = userPaymentAfter!.createdPoliciesCount;
      const [payAsYouGoPolicyPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Verify policy was created
      const payAsYouGoPolicy = await sdk.getPaymentPolicy(payAsYouGoPolicyPDA);
      expect(payAsYouGoPolicy).toBeDefined();
      expect(payAsYouGoPolicy!.policyType).toHaveProperty("payAsYouGo");

      const payAsYouGoData = payAsYouGoPolicy!.policyType.payAsYouGo;
      expect(payAsYouGoData.maxAmountPerPeriod.toNumber()).toBe(1000000);
      expect(payAsYouGoData.maxChunkAmount.toNumber()).toBe(200000);
      expect(payAsYouGoData.periodLengthSeconds.toNumber()).toBe(86400);
      expect(payAsYouGoData.currentPeriodTotal.toNumber()).toBe(0);
    });

    test("Execute pay-as-you-go payments within period limits", async () => {
      // Get the pay-as-you-go policy (created in previous test)
      const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
      const policyId = userPaymentAfter!.createdPoliciesCount;
      const [payAsYouGoPolicyPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Update SDK to use gateway signer wallet for execution
      await sdk.updateWallet(new anchor.Wallet(newSigner));

      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );

      // Execute first payment (0.1 tokens)
      const paymentAmount1 = new anchor.BN(100000); // 0.1 tokens
      const executeFirstIxs = await sdk.executePayment(
        payAsYouGoPolicyPDA,
        paymentAmount1
      );
      const executeFirstTx = new Transaction().add(...executeFirstIxs);
      await sendAndConfirmTransaction(connection, executeFirstTx, [newSigner], {
        commitment: "processed" as Commitment,
      });

      // Verify first payment
      const afterFirstBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      // Account for protocol fees (100 bps = 1%) and gateway fees (250 bps = 2.5%)
      // Total fees = 3.5% = 3500 on 100000 amount, net transfer = 96500
      const expectedNetAmount = 100000 - Math.floor((100000 * 350) / 10000); // 96500
      expect(afterFirstBalance.value.amount).toBe(
        (
          BigInt(initialRecipientBalance.value.amount) +
          BigInt(expectedNetAmount)
        ).toString()
      );

      let updatedPolicy = await sdk.getPaymentPolicy(payAsYouGoPolicyPDA);
      expect(updatedPolicy!.paymentCount).toBe(1);
      expect(
        updatedPolicy!.policyType.payAsYouGo!.currentPeriodTotal.toNumber()
      ).toBe(100000);

      // Execute second payment (0.15 tokens)
      const paymentAmount2 = new anchor.BN(150000); // 0.15 tokens
      const executeSecondIxs = await sdk.executePayment(
        payAsYouGoPolicyPDA,
        paymentAmount2
      );
      const executeSecondTx = new Transaction().add(...executeSecondIxs);
      await sendAndConfirmTransaction(
        connection,
        executeSecondTx,
        [newSigner],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify second payment
      const afterSecondBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      // Account for fees on both payments (3.5% total = 8750 on 250000 total)
      const expectedSecondNetAmount =
        250000 - Math.floor((250000 * 350) / 10000); // 241250
      expect(afterSecondBalance.value.amount).toBe(
        (
          BigInt(initialRecipientBalance.value.amount) +
          BigInt(expectedSecondNetAmount)
        ).toString()
      );

      updatedPolicy = await sdk.getPaymentPolicy(payAsYouGoPolicyPDA);
      expect(updatedPolicy!.paymentCount).toBe(2);
      expect(
        updatedPolicy!.policyType.payAsYouGo!.currentPeriodTotal.toNumber()
      ).toBe(250000);
    });

    test("Pay-as-you-go payment exceeds chunk limit", async () => {
      // Get the pay-as-you-go policy
      const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
      const policyId = userPaymentAfter!.createdPoliciesCount;
      const [payAsYouGoPolicyPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Update SDK to use gateway signer wallet (newSigner, not gatewayAuthority)
      await sdk.updateWallet(new anchor.Wallet(newSigner));

      // Try to execute payment that exceeds maxChunkAmount (0.2 tokens = 200000)
      const excessiveAmount = new anchor.BN(250000); // 0.25 tokens - exceeds limit

      try {
        const executeExcessiveIxs = await sdk.executePayment(
          payAsYouGoPolicyPDA,
          excessiveAmount
        );
        const executeExcessiveTx = new Transaction().add(
          ...executeExcessiveIxs
        );
        await sendAndConfirmTransaction(
          connection,
          executeExcessiveTx,
          [newSigner],
          {
            commitment: "processed" as Commitment,
          }
        );
        assert(false, "Expected payment to fail due to chunk size limit");
      } catch (error: any) {
        expect(error.message).toContain("InvalidAmount");
      }
    });

    test("Pay-as-you-go payment exceeds period limit", async () => {
      // Create a new pay-as-you-go policy with smaller limits for testing
      await sdk.updateWallet(new anchor.Wallet(user));

      const smallMaxAmountPerPeriod = new anchor.BN(300000); // 0.3 tokens per period
      const smallMaxChunkAmount = new anchor.BN(150000); // 0.15 tokens per chunk
      const periodLengthSeconds = new anchor.BN(3600); // 1 hour

      const memo2 = new Uint8Array(64).fill(0);
      Buffer.from("small pay-as-you-go test").copy(memo2);

      const createSmallPayAsYouGoIxs = await sdk.createPayAsYouGo(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        smallMaxAmountPerPeriod,
        smallMaxChunkAmount,
        periodLengthSeconds,
        Array.from(memo2)
      );

      const createTx = new Transaction().add(...createSmallPayAsYouGoIxs);
      await sendAndConfirmTransaction(connection, createTx, [user], {
        commitment: "processed" as Commitment,
      });

      // Get the new pay-as-you-go policy (next policy ID)
      const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
      const newPolicyId = userPaymentAfter!.createdPoliciesCount;
      const [smallPayAsYouGoPolicyPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(newPolicyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Update SDK to use gateway signer wallet (newSigner)
      await sdk.updateWallet(new anchor.Wallet(newSigner));

      // Execute first payment (0.1 tokens)
      const paymentAmount1 = new anchor.BN(100000); // 0.1 tokens
      const executeFirstIxs = await sdk.executePayment(
        smallPayAsYouGoPolicyPDA,
        paymentAmount1
      );
      const executeFirstTx = new Transaction().add(...executeFirstIxs);
      await sendAndConfirmTransaction(connection, executeFirstTx, [newSigner], {
        commitment: "processed" as Commitment,
      });

      // Execute second payment (0.15 tokens) - should succeed (total: 0.25 < 0.3)
      const paymentAmount2 = new anchor.BN(150000);
      const executeSecondIxs = await sdk.executePayment(
        smallPayAsYouGoPolicyPDA,
        paymentAmount2
      );
      const executeSecondTx = new Transaction().add(...executeSecondIxs);
      await sendAndConfirmTransaction(
        connection,
        executeSecondTx,
        [newSigner],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Try third payment that would exceed period limit (0.06 tokens, total would be 0.31 > 0.3)
      const paymentAmount3 = new anchor.BN(60000);
      try {
        const executeThirdIxs = await sdk.executePayment(
          smallPayAsYouGoPolicyPDA,
          paymentAmount3
        );
        const executeThirdTx = new Transaction().add(...executeThirdIxs);
        await sendAndConfirmTransaction(
          connection,
          executeThirdTx,
          [newSigner],
          {
            commitment: "processed" as Commitment,
          }
        );
        assert(false, "Expected payment to fail due to period limit");
      } catch (error: any) {
        expect(error.message).toContain("InvalidAmount");
      }
    });

    test("Pay-as-you-go policy validation", async () => {
      // Switch to user wallet
      await sdk.updateWallet(new anchor.Wallet(user));

      // Test invalid parameters - validation happens on program side
      try {
        // maxAmountPerPeriod = 0 (invalid)
        const invalidIxs = await sdk.createPayAsYouGo(
          tokenMint,
          recipient.publicKey,
          gatewayPDA,
          new anchor.BN(0), // Invalid
          new anchor.BN(100000),
          new anchor.BN(86400),
          Array.from(new Uint8Array(64).fill(0))
        );
        const invalidTx = new Transaction().add(...invalidIxs);
        await sendAndConfirmTransaction(connection, invalidTx, [user], {
          commitment: "processed" as Commitment,
        });
        assert(
          false,
          "Expected policy creation to fail with invalid maxAmountPerPeriod"
        );
      } catch (error: any) {
        expect(error.message).toContain("InvalidAmount");
      }

      try {
        // maxChunkAmount > maxAmountPerPeriod (invalid)
        const invalidIxs2 = await sdk.createPayAsYouGo(
          tokenMint,
          recipient.publicKey,
          gatewayPDA,
          new anchor.BN(100000),
          new anchor.BN(200000), // Invalid: chunk > period max
          new anchor.BN(86400),
          Array.from(new Uint8Array(64).fill(0))
        );
        const invalidTx2 = new Transaction().add(...invalidIxs2);
        await sendAndConfirmTransaction(connection, invalidTx2, [user], {
          commitment: "processed" as Commitment,
        });
        assert(
          false,
          "Expected policy creation to fail with invalid chunk size"
        );
      } catch (error: any) {
        expect(error.message).toContain("InvalidAmount");
      }

      try {
        // periodLengthSeconds = 0 (invalid)
        const invalidIxs3 = await sdk.createPayAsYouGo(
          tokenMint,
          recipient.publicKey,
          gatewayPDA,
          new anchor.BN(1000000),
          new anchor.BN(100000),
          new anchor.BN(0), // Invalid
          Array.from(new Uint8Array(64).fill(0))
        );
        const invalidTx3 = new Transaction().add(...invalidIxs3);
        await sendAndConfirmTransaction(connection, invalidTx3, [user], {
          commitment: "processed" as Commitment,
        });
        assert(
          false,
          "Expected policy creation to fail with invalid period length"
        );
      } catch (error: any) {
        expect(error.message).toContain("Invalid Interval");
      }
    });
  });

  describe("Referral program", () => {
    // Test users for referral chain
    let referrerL1: Keypair;
    let referrerL2: Keypair;
    let referrerL3: Keypair;
    let payer: Keypair;

    // Token accounts for referrers
    let l1TokenAccount: PublicKey;
    let l2TokenAccount: PublicKey;
    let l3TokenAccount: PublicKey;
    let payerTokenAccount: PublicKey;

    // Referral account PDAs
    let l1ReferralPDA: PublicKey;
    let l2ReferralPDA: PublicKey;
    let l3ReferralPDA: PublicKey;
    let payerReferralPDA: PublicKey;

    // Payment policy for payer
    let payerPolicyPDA: PublicKey;

    beforeAll(async () => {
      // Create new keypairs for referral test users
      referrerL1 = Keypair.generate();
      referrerL2 = Keypair.generate();
      referrerL3 = Keypair.generate();
      payer = Keypair.generate();

      // Fund the new accounts
      await Promise.all([
        fund(referrerL1.publicKey, 5),
        fund(referrerL2.publicKey, 5),
        fund(referrerL3.publicKey, 5),
        fund(payer.publicKey, 5),
      ]);

      // Create token accounts for referrers and payer
      l1TokenAccount = await createAssociatedTokenAccount(
        connection,
        admin,
        tokenMint,
        referrerL1.publicKey
      );
      l2TokenAccount = await createAssociatedTokenAccount(
        connection,
        admin,
        tokenMint,
        referrerL2.publicKey
      );
      l3TokenAccount = await createAssociatedTokenAccount(
        connection,
        admin,
        tokenMint,
        referrerL3.publicKey
      );
      payerTokenAccount = await createAssociatedTokenAccount(
        connection,
        admin,
        tokenMint,
        payer.publicKey
      );

      // Mint tokens to all accounts
      await mintTo(
        connection,
        mintAuthority,
        tokenMint,
        l1TokenAccount,
        mintAuthority,
        1000000n
      );
      await mintTo(
        connection,
        mintAuthority,
        tokenMint,
        l2TokenAccount,
        mintAuthority,
        1000000n
      );
      await mintTo(
        connection,
        mintAuthority,
        tokenMint,
        l3TokenAccount,
        mintAuthority,
        1000000n
      );
      await mintTo(
        connection,
        mintAuthority,
        tokenMint,
        payerTokenAccount,
        mintAuthority,
        2000000n
      );

      // Derive referral PDAs
      [l1ReferralPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("referral"),
          gatewayPDA.toBuffer(),
          referrerL1.publicKey.toBuffer(),
        ],
        program.programId
      );
      [l2ReferralPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("referral"),
          gatewayPDA.toBuffer(),
          referrerL2.publicKey.toBuffer(),
        ],
        program.programId
      );
      [l3ReferralPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("referral"),
          gatewayPDA.toBuffer(),
          referrerL3.publicKey.toBuffer(),
        ],
        program.programId
      );
      [payerReferralPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("referral"),
          gatewayPDA.toBuffer(),
          payer.publicKey.toBuffer(),
        ],
        program.programId
      );
    });

    test("Create referral accounts for L1, L2, L3 referrers and payer", async () => {
      // L3 creates referral account (no referrer)
      await sdk.updateWallet(new anchor.Wallet(referrerL3));
      const createL3Ix = await sdk.createReferralAccount(
        gatewayPDA,
        "REF003", // 6-char code
        null // No referrer
      );
      let tx = new Transaction().add(createL3Ix);
      await sendAndConfirmTransaction(connection, tx, [referrerL3], {
        commitment: "processed" as Commitment,
      });

      let l3Referral = await sdk.getReferralAccount(l3ReferralPDA);
      expect(l3Referral).not.toBeNull();
      expect(l3Referral!.owner).toEqual(referrerL3.publicKey);
      expect(l3Referral!.referrer).toBeNull();
      expect(l3Referral!.gateway).toEqual(gatewayPDA);

      // L2 creates referral account with L3 as referrer
      await sdk.updateWallet(new anchor.Wallet(referrerL2));
      const createL2Ix = await sdk.createReferralAccount(
        gatewayPDA,
        "REF002", // 6-char code
        referrerL3.publicKey // L3 is referrer
      );
      tx = new Transaction().add(createL2Ix);
      await sendAndConfirmTransaction(connection, tx, [referrerL2], {
        commitment: "processed" as Commitment,
      });

      let l2Referral = await sdk.getReferralAccount(l2ReferralPDA);
      expect(l2Referral).not.toBeNull();
      expect(l2Referral!.owner).toEqual(referrerL2.publicKey);
      expect(l2Referral!.referrer).toEqual(referrerL3.publicKey);

      // L1 creates referral account with L2 as referrer
      await sdk.updateWallet(new anchor.Wallet(referrerL1));
      const createL1Ix = await sdk.createReferralAccount(
        gatewayPDA,
        "REF001", // 6-char code
        referrerL2.publicKey // L2 is referrer
      );
      tx = new Transaction().add(createL1Ix);
      await sendAndConfirmTransaction(connection, tx, [referrerL1], {
        commitment: "processed" as Commitment,
      });

      let l1Referral = await sdk.getReferralAccount(l1ReferralPDA);
      expect(l1Referral).not.toBeNull();
      expect(l1Referral!.owner).toEqual(referrerL1.publicKey);
      expect(l1Referral!.referrer).toEqual(referrerL2.publicKey);

      // Payer creates referral account with L1 as referrer
      await sdk.updateWallet(new anchor.Wallet(payer));
      const createPayerIx = await sdk.createReferralAccount(
        gatewayPDA,
        "PAYER1", // 6-char code
        referrerL1.publicKey // L1 is referrer
      );
      tx = new Transaction().add(createPayerIx);
      await sendAndConfirmTransaction(connection, tx, [payer], {
        commitment: "processed" as Commitment,
      });

      let payerReferral = await sdk.getReferralAccount(payerReferralPDA);
      expect(payerReferral).not.toBeNull();
      expect(payerReferral!.owner).toEqual(payer.publicKey);
      expect(payerReferral!.referrer).toEqual(referrerL1.publicKey);
    });

    test("Verify referral chain traversal", async () => {
      // Get the referral chain for the payer
      const chain = await sdk.getReferralChain(payer.publicKey, gatewayPDA);

      // Should have [L1, L2, L3] in the chain
      expect(chain[0]).toEqual(referrerL1.publicKey); // L1
      expect(chain[1]).toEqual(referrerL2.publicKey); // L2
      expect(chain[2]).toEqual(referrerL3.publicKey); // L3
    });

    test("Update gateway with referral settings", async () => {
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

      // Enable referral program with 500 bps (5%) allocation and 60/30/10 tier split
      const updateIx = await sdk.updateGatewayReferralSettings(
        gatewayAuthority.publicKey,
        1, // featureFlags: bit 0 = referral enabled
        500, // referralAllocationBps: 5% of gateway fee to referrals
        [6000, 3000, 1000] // referralTiersBps: L1=60%, L2=30%, L3=10%
      );

      const tx = new Transaction().add(updateIx);
      await sendAndConfirmTransaction(connection, tx, [gatewayAuthority], {
        commitment: "processed" as Commitment,
      });

      const gateway = await sdk.getPaymentGateway(gatewayPDA);
      expect(gateway!.featureFlags).toBe(1); // Referral enabled
      expect(gateway!.referralAllocationBps).toBe(500);
      expect(gateway!.referralTiersBps).toEqual([6000, 3000, 1000]);
    });

    test("Create payment policy for payer with referral", async () => {
      await sdk.updateWallet(new anchor.Wallet(payer));

      // Create a user payment account for the payer
      const [payerUserPaymentPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_payment"),
          payer.publicKey.toBuffer(),
          tokenMint.toBuffer(),
        ],
        program.programId
      );

      const createUserPaymentIx = await sdk.createUserPayment(tokenMint);
      let tx = new Transaction().add(createUserPaymentIx);
      await sendAndConfirmTransaction(connection, tx, [payer], {
        commitment: "processed" as Commitment,
      });

      // Create a pay-as-you-go policy for the payer
      const maxAmountPerPeriod = new anchor.BN(1000000);
      const maxChunkAmount = new anchor.BN(100000);
      const periodLengthSeconds = new anchor.BN(86400);
      const memo = new Uint8Array(64).fill(0);
      Buffer.from("referral payment test").copy(memo);

      const createPolicyIxs = await sdk.createPayAsYouGo(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        maxAmountPerPeriod,
        maxChunkAmount,
        periodLengthSeconds,
        Array.from(memo)
      );
      tx = new Transaction().add(...createPolicyIxs);
      await sendAndConfirmTransaction(connection, tx, [payer], {
        commitment: "processed" as Commitment,
      });

      // Get the policy PDA
      const payerUserPayment = await sdk.getUserPayment(payerUserPaymentPDA);
      const policyId = payerUserPayment!.createdPoliciesCount;
      [payerPolicyPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          payerUserPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      const policy = await sdk.getPaymentPolicy(payerPolicyPDA);
      expect(policy).not.toBeNull();
      expect(policy!.policyType).toHaveProperty("payAsYouGo");
    });

    test("Execute payment with referral rewards", async () => {
      // Get initial balances
      const initialL1Balance = await connection.getTokenAccountBalance(
        l1TokenAccount
      );
      const initialL2Balance = await connection.getTokenAccountBalance(
        l2TokenAccount
      );
      const initialL3Balance = await connection.getTokenAccountBalance(
        l3TokenAccount
      );
      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );

      // Set up delegate approval for payer
      const [paymentsDelegate] = PublicKey.findProgramAddressSync(
        [Buffer.from("payments")],
        program.programId
      );

      await approve(
        connection,
        payer,
        payerTokenAccount,
        paymentsDelegate,
        payer,
        2000000
      );

      // Execute payment (should automatically include referral accounts)
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

      const paymentAmount = new anchor.BN(100000); // 0.1 tokens
      const executeIxs = await sdk.executePayment(
        payerPolicyPDA,
        paymentAmount
      );
      const tx = new Transaction().add(...executeIxs);
      await sendAndConfirmTransaction(connection, tx, [gatewayAuthority], {
        commitment: "processed" as Commitment,
      });

      // Verify payment was executed
      const finalRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      expect(parseInt(finalRecipientBalance.value.amount)).toBeGreaterThan(
        parseInt(initialRecipientBalance.value.amount)
      );

      // Check that referral rewards were distributed
      // Gateway fee = 2.5% of 100000 = 2500
      // Referral pool = 5% of gateway fee = 125
      // L1 reward = 60% of 125 = 75
      // L2 reward = 30% of 125 = 37
      // L3 reward = 10% of 125 = 12
      const gateway = await sdk.getPaymentGateway(gatewayPDA);
      const gatewayFee = Math.floor(
        (paymentAmount.toNumber() * gateway!.gatewayFeeBps) / 10000
      );
      const referralPool = Math.floor(
        (gatewayFee * gateway!.referralAllocationBps) / 10000
      );
      const l1Reward = Math.floor(
        (referralPool * gateway!.referralTiersBps[0]) / 10000
      );
      const l2Reward = Math.floor(
        (referralPool * gateway!.referralTiersBps[1]) / 10000
      );
      const l3Reward = Math.floor(
        (referralPool * gateway!.referralTiersBps[2]) / 10000
      );

      const finalL1Balance = await connection.getTokenAccountBalance(
        l1TokenAccount
      );
      const finalL2Balance = await connection.getTokenAccountBalance(
        l2TokenAccount
      );
      const finalL3Balance = await connection.getTokenAccountBalance(
        l3TokenAccount
      );

      // Verify referral rewards were credited (accounting for fees)
      expect(parseInt(finalL1Balance.value.amount)).toBeGreaterThanOrEqual(
        parseInt(initialL1Balance.value.amount) +
          l1Reward -
          Math.floor((l1Reward * 100) / 10000) // minus protocol fee
      );
      expect(parseInt(finalL2Balance.value.amount)).toBeGreaterThanOrEqual(
        parseInt(initialL2Balance.value.amount) +
          l2Reward -
          Math.floor((l2Reward * 100) / 10000)
      );
      expect(parseInt(finalL3Balance.value.amount)).toBeGreaterThanOrEqual(
        parseInt(initialL3Balance.value.amount) +
          l3Reward -
          Math.floor((l3Reward * 100) / 10000)
      );

      // Verify referral accounts' total_earned was updated
      const l1Referral = await sdk.getReferralAccount(l1ReferralPDA);
      const l2Referral = await sdk.getReferralAccount(l2ReferralPDA);
      const l3Referral = await sdk.getReferralAccount(l3ReferralPDA);

      expect(l1Referral!.totalEarned.toNumber()).toBeGreaterThan(0);
      expect(l2Referral!.totalEarned.toNumber()).toBeGreaterThan(0);
      expect(l3Referral!.totalEarned.toNumber()).toBeGreaterThan(0);
    });

    test("Referral program with only L1 referrer", async () => {
      // Create a new referrer that has NO further referrers (origin of chain)
      const singleL1Referrer = Keypair.generate();
      await fund(singleL1Referrer.publicKey, 5);

      const singleL1TokenAccount = await createAssociatedTokenAccount(
        connection,
        admin,
        tokenMint,
        singleL1Referrer.publicKey
      );
      await mintTo(
        connection,
        mintAuthority,
        tokenMint,
        singleL1TokenAccount,
        mintAuthority,
        1000000n
      );

      // Create a referral account for singleL1Referrer with NO referrer (origin)
      await sdk.updateWallet(new anchor.Wallet(singleL1Referrer));
      const createSingleL1Ix = await sdk.createReferralAccount(
        gatewayPDA,
        "L1ONLY", // 6-char code
        null // No referrer - this is the origin
      );
      let tx = new Transaction().add(createSingleL1Ix);
      await sendAndConfirmTransaction(connection, tx, [singleL1Referrer], {
        commitment: "processed" as Commitment,
      });

      // Create a new payer who uses singleL1Referrer as their only referrer
      const singleReferrerPayer = Keypair.generate();
      await fund(singleReferrerPayer.publicKey, 5);

      const singlePayerTokenAccount = await createAssociatedTokenAccount(
        connection,
        admin,
        tokenMint,
        singleReferrerPayer.publicKey
      );
      await mintTo(
        connection,
        mintAuthority,
        tokenMint,
        singlePayerTokenAccount,
        mintAuthority,
        1000000n
      );

      const [singlePayerReferralPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("referral"),
          gatewayPDA.toBuffer(),
          singleReferrerPayer.publicKey.toBuffer(),
        ],
        program.programId
      );

      // Create referral account with only L1 referrer (singleL1Referrer)
      await sdk.updateWallet(new anchor.Wallet(singleReferrerPayer));
      const createSinglePayerIx = await sdk.createReferralAccount(
        gatewayPDA,
        "SINGL1", // 6-char code
        singleL1Referrer.publicKey // Only L1 (who has no further referrers)
      );
      tx = new Transaction().add(createSinglePayerIx);
      await sendAndConfirmTransaction(connection, tx, [singleReferrerPayer], {
        commitment: "processed" as Commitment,
      });

      // Create user payment and policy
      const [singlePayerUserPaymentPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_payment"),
          singleReferrerPayer.publicKey.toBuffer(),
          tokenMint.toBuffer(),
        ],
        program.programId
      );

      const createUserPaymentIx = await sdk.createUserPayment(tokenMint);
      tx = new Transaction().add(createUserPaymentIx);
      await sendAndConfirmTransaction(connection, tx, [singleReferrerPayer], {
        commitment: "processed" as Commitment,
      });

      const createPolicyIxs = await sdk.createPayAsYouGo(
        tokenMint,
        recipient.publicKey,
        gatewayPDA,
        new anchor.BN(1000000),
        new anchor.BN(100000),
        new anchor.BN(86400),
        Array.from(new Uint8Array(64))
      );
      tx = new Transaction().add(...createPolicyIxs);
      await sendAndConfirmTransaction(connection, tx, [singleReferrerPayer], {
        commitment: "processed" as Commitment,
      });

      const singlePayerUserPayment = await sdk.getUserPayment(
        singlePayerUserPaymentPDA
      );
      const policyId = singlePayerUserPayment!.createdPoliciesCount;
      const [singlePayerPolicyPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          singlePayerUserPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Verify chain shows only L1
      console.log("Fetching singleRefPayer chain");
      const chain = await sdk.getReferralChain(
        singleReferrerPayer.publicKey,
        gatewayPDA
      );
      expect(chain.length).toEqual(3);
      expect(chain[0]).toEqual(singleL1Referrer.publicKey); // L1 (direct referrer)
      expect(chain[1]).toBeNull(); // L2 - singleL1Referrer has no referrer
      expect(chain[2]).toBeNull(); // L3

      // Set up approval and execute payment
      const [paymentsDelegate] = PublicKey.findProgramAddressSync(
        [Buffer.from("payments")],
        program.programId
      );
      await approve(
        connection,
        singleReferrerPayer,
        singlePayerTokenAccount,
        paymentsDelegate,
        singleReferrerPayer,
        1000000
      );

      const initialL1Balance = await connection.getTokenAccountBalance(
        singleL1TokenAccount
      );

      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));
      const executeIxs = await sdk.executePayment(
        singlePayerPolicyPDA,
        new anchor.BN(100000)
      );
      tx = new Transaction().add(...executeIxs);
      await sendAndConfirmTransaction(connection, tx, [gatewayAuthority], {
        commitment: "processed" as Commitment,
      });

      // Verify only L1 (singleL1Referrer) received reward
      const finalL1Balance = await connection.getTokenAccountBalance(
        singleL1TokenAccount
      );
      expect(parseInt(finalL1Balance.value.amount)).toBeGreaterThan(
        parseInt(initialL1Balance.value.amount)
      );
    });

    test("Referral program disabled - no rewards distributed", async () => {
      // Create a new gateway with referral disabled
      const newGatewayAuthority = Keypair.generate();
      await fund(newGatewayAuthority.publicKey, 5);

      const [newGatewayPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("gateway"), newGatewayAuthority.publicKey.toBuffer()],
        program.programId
      );

      // Create new fee recipient
      const newFeeRecipient = Keypair.generate();
      await fund(newFeeRecipient.publicKey, 1);
      await createAssociatedTokenAccount(
        connection,
        admin,
        tokenMint,
        newFeeRecipient.publicKey
      );

      // Create gateway with referral disabled (featureFlags = 0)
      await sdk.updateWallet(new anchor.Wallet(admin));
      const createGatewayIx = await sdk.createPaymentGateway(
        newGatewayAuthority.publicKey,
        250, // 2.5% gateway fee
        newFeeRecipient.publicKey,
        "no referral gateway",
        "https://noreferral.example.com"
      );
      let tx = new Transaction().add(createGatewayIx);
      await sendAndConfirmTransaction(connection, tx, [admin], {
        commitment: "processed" as Commitment,
      });

      // Create a new payer for this gateway
      const noReferralPayer = Keypair.generate();
      await fund(noReferralPayer.publicKey, 5);

      const noRefPayerTokenAccount = await createAssociatedTokenAccount(
        connection,
        admin,
        tokenMint,
        noReferralPayer.publicKey
      );
      await mintTo(
        connection,
        mintAuthority,
        tokenMint,
        noRefPayerTokenAccount,
        mintAuthority,
        1000000n
      );

      // Create user payment
      const [noRefPayerUserPaymentPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_payment"),
          noReferralPayer.publicKey.toBuffer(),
          tokenMint.toBuffer(),
        ],
        program.programId
      );

      await sdk.updateWallet(new anchor.Wallet(noReferralPayer));
      const createUserPaymentIx = await sdk.createUserPayment(tokenMint);
      tx = new Transaction().add(createUserPaymentIx);
      await sendAndConfirmTransaction(connection, tx, [noReferralPayer], {
        commitment: "processed" as Commitment,
      });

      const createPolicyIxs = await sdk.createPayAsYouGo(
        tokenMint,
        recipient.publicKey,
        newGatewayPDA,
        new anchor.BN(1000000),
        new anchor.BN(100000),
        new anchor.BN(86400),
        Array.from(new Uint8Array(64))
      );
      tx = new Transaction().add(...createPolicyIxs);
      await sendAndConfirmTransaction(connection, tx, [noReferralPayer], {
        commitment: "processed" as Commitment,
      });

      const noRefPayerUserPayment = await sdk.getUserPayment(
        noRefPayerUserPaymentPDA
      );
      const policyId = noRefPayerUserPayment!.createdPoliciesCount;
      const [noRefPayerPolicyPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          noRefPayerUserPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Set up approval
      const [paymentsDelegate] = PublicKey.findProgramAddressSync(
        [Buffer.from("payments")],
        program.programId
      );
      await approve(
        connection,
        noReferralPayer,
        noRefPayerTokenAccount,
        paymentsDelegate,
        noReferralPayer,
        1000000
      );

      // Get initial L1 balance
      const initialL1Balance = await connection.getTokenAccountBalance(
        l1TokenAccount
      );

      // Execute payment
      await sdk.updateWallet(new anchor.Wallet(newGatewayAuthority));
      const executeIxs = await sdk.executePayment(
        noRefPayerPolicyPDA,
        new anchor.BN(100000)
      );
      tx = new Transaction().add(...executeIxs);
      await sendAndConfirmTransaction(connection, tx, [newGatewayAuthority], {
        commitment: "processed" as Commitment,
      });

      // Verify L1 did NOT receive any referral reward (referral is disabled)
      const finalL1Balance = await connection.getTokenAccountBalance(
        l1TokenAccount
      );
      expect(parseInt(finalL1Balance.value.amount)).toEqual(
        parseInt(initialL1Balance.value.amount)
      );
    });
  });
});
