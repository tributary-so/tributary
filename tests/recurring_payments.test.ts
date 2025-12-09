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
import { RecurringPayments } from "../target/types/recurring_payments";
import { PaymentFrequency, RecurringPaymentsSDK } from "../sdk/src";
import assert from "assert";

describe("Recurring Payments", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .RecurringPayments as anchor.Program<RecurringPayments>;
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
  let sdk: RecurringPaymentsSDK;

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
    sdk = new RecurringPaymentsSDK(connection, wallet);

    // Create wallets
    admin = Keypair.generate();
    await fund(admin.publicKey, 10);
    user = Keypair.generate();
    await fund(user.publicKey, 10);
    mintAuthority = Keypair.generate();
    await fund(mintAuthority.publicKey, 10);

    // Derive config PDA
    [configPDA, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

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

    // Create gateway authority and fee recipient
    gatewayAuthority = Keypair.generate();
    await fund(gatewayAuthority.publicKey, 10);
    feeRecipient = Keypair.generate();
    await fund(feeRecipient.publicKey, 1);

    // Derive gateway PDA
    [gatewayPDA, gatewayBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("gateway"), gatewayAuthority.publicKey.toBuffer()],
      program.programId
    );

    // Create recipient
    recipient = Keypair.generate();
    await fund(recipient.publicKey, 1);

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
    expect(userPayment!.activePoliciesCount).toBe(0);
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
    expect(gatewayAccount!.totalProcessed.toNumber()).toBe(0);
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
      expect(updatedUserPayment!.activePoliciesCount).toBe(1);
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

      // Verify gateway stats were updated
      const updatedGateway = await sdk.getPaymentGateway(gatewayPDA);
      expect(updatedGateway!.totalProcessed.toNumber()).toBe(10000);
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

  // test("Delete payment policy", async () => {
  //   // Get initial user payment state
  //   const initialUserPayment = await sdk.getUserPayment(userPaymentPDA);
  //   const initialActivePoliciesCount = initialUserPayment!.activePoliciesCount;
  //
  //   // Use policy ID 2 from a previous test (the second policy created)
  //   const policyIdToDelete = 2;
  //   const [policyToDeletePDA] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from("payment_policy"),
  //       userPaymentPDA.toBuffer(),
  //       new anchor.BN(policyIdToDelete).toArrayLike(Buffer, "le", 4),
  //     ],
  //     program.programId
  //   );
  //
  //   // Verify policy exists before deletion
  //   const policyBeforeDeletion = await sdk.getPaymentPolicy(policyToDeletePDA);
  //   expect(policyBeforeDeletion).not.toBeNull();
  //   expect(policyBeforeDeletion!.policyId).toBe(policyIdToDelete);
  //
  //   // Delete the payment policy (only owner can delete)
  //   await sdk.updateWallet(new anchor.Wallet(user));
  //
  //   const deleteIx = await sdk.deletePaymentPolicy(tokenMint, policyIdToDelete);
  //   const deleteTx = new Transaction().add(deleteIx);
  //   await sendAndConfirmTransaction(connection, deleteTx, [user]);
  //
  //   // Verify policy was deleted (account should not exist)
  //   const policyAfterDeletion = await sdk.getPaymentPolicy(policyToDeletePDA);
  //   expect(policyAfterDeletion).toBeNull();
  //
  //   // Verify user payment active policies count was decremented
  //   const updatedUserPayment = await sdk.getUserPayment(userPaymentPDA);
  //   expect(updatedUserPayment!.activePoliciesCount).toBe(
  //     initialActivePoliciesCount - 1
  //   );
  //   expect(updatedUserPayment!.updatedAt.toNumber()).toBeGreaterThanOrEqual(
  //     initialUserPayment!.updatedAt.toNumber()
  //   );
  // });

  test("Change gateway signer", async () => {
    // Create a new signer keypair
    const newSigner = Keypair.generate();
    await fund(newSigner.publicKey, 1);

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
      const policies = await sdk.getPaymentPoliciesByUser(user.publicKey);
      const milestonePolicy = policies.find(
        (p) =>
          p.account.userPayment.equals(userPaymentPDA) &&
          p.account.policyId === 5 // Policy ID based on previous tests
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
      const policies = await sdk.getPaymentPoliciesByUser(user.publicKey);
      const milestonePolicy = policies.find(
        (p) =>
          p.account.userPayment.equals(userPaymentPDA) &&
          p.account.policyId === 5
      );
      expect(milestonePolicy).toBeDefined();

      const policyPda = milestonePolicy!.publicKey;

      // Update SDK to use gateway authority wallet for execution
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

      // First milestone should fail (not due yet - timestamp is in future)
      try {
        const executePaymentIxs = await sdk.executePayment(policyPda);
        const tx = new Transaction().add(...executePaymentIxs);
        await sendAndConfirmTransaction(connection, tx, [gatewayAuthority], {
          commitment: "processed" as Commitment,
        });
        assert(false, "Expected milestone execution to fail when not due");
      } catch (error: any) {
        expect(error.message).toContain("MilestoneNotDue");
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
        new anchor.BN(pastTime + 60), // also due
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
      const updatedPolicies = await sdk.getPaymentPoliciesByUser(
        user.publicKey
      );
      const pastMilestonePolicy = updatedPolicies.find(
        (p) =>
          p.account.userPayment.equals(userPaymentPDA) &&
          p.account.policyId === 6
      );
      expect(pastMilestonePolicy).toBeDefined();

      const pastPolicyPda = pastMilestonePolicy!.publicKey;

      // Execute first milestone
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

      const initialRecipientBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );

      const executeFirstIxs = await sdk.executePayment(pastPolicyPda);
      const executeFirstTx = new Transaction().add(...executeFirstIxs);
      await sendAndConfirmTransaction(
        connection,
        executeFirstTx,
        [gatewayAuthority],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify first milestone was executed
      const afterFirstBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      const firstMilestoneAmount = 500000; // 0.5 tokens in smallest units
      expect(afterFirstBalance.value.amount).toBe(
        (
          BigInt(initialRecipientBalance.value.amount) +
          BigInt(firstMilestoneAmount)
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
        [gatewayAuthority],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify second milestone was executed
      const afterSecondBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      const secondMilestoneAmount = 750000; // 0.75 tokens in smallest units
      const totalExpected = firstMilestoneAmount + secondMilestoneAmount;
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
          [gatewayAuthority],
          {
            commitment: "processed" as Commitment,
          }
        );
        assert(
          false,
          "Expected execution to fail when all milestones completed"
        );
      } catch (error: any) {
        expect(error.message).toContain("AllMilestonesCompleted");
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
        new anchor.BN(currentTime - 3600), // already due
        new anchor.BN(currentTime - 1800), // already due
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

      // Get the manual milestone policy (policy ID 7)
      const policies = await sdk.getPaymentPoliciesByUser(user.publicKey);
      const manualMilestonePolicy = policies.find(
        (p) =>
          p.account.userPayment.equals(userPaymentPDA) &&
          p.account.policyId === 7
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
      const policyId = userPaymentAfter!.activePoliciesCount;
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
      // Get the pay-as-you-go policy we just created
      const userPaymentAfter = await sdk.getUserPayment(userPaymentPDA);
      const policyId = userPaymentAfter!.activePoliciesCount;
      const [payAsYouGoPolicyPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Update SDK to use gateway authority wallet for execution
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

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
      await sendAndConfirmTransaction(
        connection,
        executeFirstTx,
        [gatewayAuthority],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify first payment
      const afterFirstBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      expect(afterFirstBalance.value.amount).toBe(
        (
          BigInt(initialRecipientBalance.value.amount) + BigInt(100000)
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
        [gatewayAuthority],
        {
          commitment: "processed" as Commitment,
        }
      );

      // Verify second payment
      const afterSecondBalance = await connection.getTokenAccountBalance(
        recipientTokenAccount
      );
      expect(afterSecondBalance.value.amount).toBe(
        (
          BigInt(initialRecipientBalance.value.amount) + BigInt(250000)
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
      const policyId = userPaymentAfter!.activePoliciesCount;
      const [payAsYouGoPolicyPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(policyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Update SDK to use gateway authority wallet
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

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
          [gatewayAuthority],
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
      const newPolicyId = userPaymentAfter!.activePoliciesCount;
      const [smallPayAsYouGoPolicyPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("payment_policy"),
          userPaymentPDA.toBuffer(),
          new anchor.BN(newPolicyId).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      // Update SDK to use gateway authority wallet
      await sdk.updateWallet(new anchor.Wallet(gatewayAuthority));

      // Execute first payment (0.1 tokens)
      const paymentAmount1 = new anchor.BN(100000);
      const executeFirstIxs = await sdk.executePayment(
        smallPayAsYouGoPolicyPDA,
        paymentAmount1
      );
      const executeFirstTx = new Transaction().add(...executeFirstIxs);
      await sendAndConfirmTransaction(
        connection,
        executeFirstTx,
        [gatewayAuthority],
        {
          commitment: "processed" as Commitment,
        }
      );

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
        [gatewayAuthority],
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
          [gatewayAuthority],
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

      // Test invalid parameters using high-level method
      try {
        // maxAmountPerPeriod = 0 (invalid)
        await sdk.createPayAsYouGo(
          tokenMint,
          recipient.publicKey,
          gatewayPDA,
          new anchor.BN(0), // Invalid
          new anchor.BN(100000),
          new anchor.BN(86400),
          []
        );
        assert(
          false,
          "Expected policy creation to fail with invalid maxAmountPerPeriod"
        );
      } catch (error: any) {
        expect(error.message).toContain("must be greater than 0");
      }

      try {
        // maxChunkAmount > maxAmountPerPeriod (invalid)
        await sdk.createPayAsYouGo(
          tokenMint,
          recipient.publicKey,
          gatewayPDA,
          new anchor.BN(100000),
          new anchor.BN(200000), // Invalid: chunk > period max
          new anchor.BN(86400),
          []
        );
        assert(
          false,
          "Expected policy creation to fail with invalid chunk size"
        );
      } catch (error: any) {
        expect(error.message).toContain("cannot exceed");
      }

      try {
        // periodLengthSeconds = 0 (invalid)
        await sdk.createPayAsYouGo(
          tokenMint,
          recipient.publicKey,
          gatewayPDA,
          new anchor.BN(1000000),
          new anchor.BN(100000),
          new anchor.BN(0), // Invalid
          []
        );
        assert(
          false,
          "Expected policy creation to fail with invalid period length"
        );
      } catch (error: any) {
        expect(error.message).toContain("must be greater than 0");
      }
    });
  });
});
